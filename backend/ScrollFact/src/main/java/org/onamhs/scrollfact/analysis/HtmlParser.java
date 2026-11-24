package org.onamhs.scrollfact.analysis;

import static org.onamhs.scrollfact.analysis.AnalysisModels.*;
import java.util.*;
import java.net.URI;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Element;
import org.jsoup.nodes.Node;
import org.jsoup.nodes.TextNode;
import org.jsoup.parser.Parser;
import org.springframework.stereotype.Component;

@Component
public class HtmlParser {
    private static final Set<String> EXCLUDED = Set.of("script", "style", "noscript", "nav", "header", "footer", "aside", "iframe", "form");
    public ParsedPage parse(String html, String url) {
        // XML serialization preserves the browser DOM, even if scripts inserted a div inside p.
        var document = html.startsWith("<!--scrollfact-dom-v1-->")
            ? Jsoup.parse(html, url, Parser.xmlParser()) : Jsoup.parse(html, url);
        var scope = contentRoot(document);
        var passages = new ArrayList<Passage>();
        var links = new LinkedHashSet<String>();
        int characters = 0;
        // Traverse direct prose as well as p/li: many publishers use article + br.
        var segments = new ArrayList<Segment>();
        collect(scope, segments);
        for (var segment : segments) {
            String text = segment.text();
            if (text.isEmpty() || isContactSignature(text)) continue;
            characters += text.length();
            if (passages.size() >= 200 || characters > 200_000)
                throw new ApiFailure(422, "document_too_complex", "선택한 본문 영역이 문단 200개 또는 20만 자를 초과했습니다. 본문 영역을 올바르게 인식했는지 확인이 필요합니다.");
            passages.add(new Passage("section-" + (passages.size() + 1), segment.selector(), text));
            for (var link : segment.links()) {
                try {
                    URI uri = URI.create(link).normalize();
                    if (!Set.of("http", "https").contains(uri.getScheme()) || uri.getHost() == null || uri.getUserInfo() != null) continue;
                    String canonical = uri.getScheme().toLowerCase() + "://" + uri.getHost().toLowerCase()
                        + (uri.getPort() == -1 ? "" : ":" + uri.getPort())
                        + (uri.getRawPath().isEmpty() ? "/" : uri.getRawPath())
                        + (uri.getRawQuery() == null ? "" : "?" + uri.getRawQuery());
                    if (!canonical.equals(url.split("#", 2)[0])) links.add(canonical);
                } catch (IllegalArgumentException ignored) { }
            }
        }
        if (passages.isEmpty()) throw new ApiFailure(422, "no_passages", "분석할 문단을 찾지 못했습니다.");
        if (links.size() > 40) throw new ApiFailure(422, "too_many_sources", "본문에 연결된 출처가 40개를 초과했습니다. 출처 처리 범위 확장이 필요합니다.");
        var comments = CommentExtractor.extract(document);
        var images = new ArrayList<ImageMaterial>();
        for (Element img : scope.select("img")) {
            if (excluded(img) || CommentExtractor.inside(img) || CommentExtractor.hidden(img) || decorativeImage(img)) continue;
            String imageUrl = img.absUrl("data-scrollfact-image-src");
            if (imageUrl.isBlank()) imageUrl = img.absUrl("data-src");
            if (imageUrl.isBlank()) imageUrl = img.absUrl("src");
            if (!imageUrl.startsWith("https://") && !imageUrl.startsWith("http://")) continue;
            if (img.attr("role").equals("presentation")) continue;
            String caption = img.attr("alt").trim();
            Element figure = img.closest("figure");
            if (figure != null && figure.selectFirst("figcaption") != null) caption = figure.selectFirst("figcaption").text();
            if (images.size() >= 20) throw new ApiFailure(422, "too_many_images", "본문 이미지가 한 번에 처리할 수 있는 20개를 넘었습니다.");
            images.add(new ImageMaterial("image-" + (images.size()+1), selector(img), imageUrl, caption));
        }
        return new ParsedPage(List.copyOf(passages), List.copyOf(links), comments, !document.select(CommentExtractor.AREAS).isEmpty() || !comments.isEmpty(), List.copyOf(images));
    }
    private boolean decorativeImage(Element image) {
        if ("true".equals(image.attr("data-scrollfact-image-decorative"))) return true;
        for (Element e = image; e != null; e = e.parent()) {
            if (e.normalName().equals("button") || Set.of("button", "menu", "menubar", "navigation", "banner").contains(e.attr("role")) || e.hasAttr("data-ad-slot")) return true;
            for (String token : e.classNames())
                if (token.matches("(?i)(?:ad|ads|advertisement|advert|ad[-_].*)")) return true;
        }
        return false;
    }
    // Only a standalone email or a short reporter signature is unambiguously
    // contact metadata. A sentence mentioning an email must remain in the article.
    static boolean isContactSignature(String text) {
        return text.matches("[^\\s@]+@[^\\s@]+\\.[^\\s@]+")
            || text.matches("[가-힣A-Za-z· .-]{1,40} 기자\\s+[^\\s@]+@[^\\s@]+\\.[^\\s@]+");
    }

    // Shared block/inline boundary rules with content/sourceSegments.ts. No host-specific selectors.
    private static final Set<String> BLOCKS = Set.of("address", "article", "aside", "blockquote", "div", "dl", "dt", "dd", "fieldset", "figcaption", "figure", "footer", "form", "h1", "h2", "h3", "h4", "h5", "h6", "header", "hr", "li", "main", "nav", "ol", "p", "pre", "section", "table", "tbody", "thead", "tr", "td", "th", "ul");
    private record Segment(String selector, String text, List<String> links) { }
    private static String normalized(String text) { return text.replaceAll("[\\s\\u00a0]+", " ").trim(); }
    private boolean omit(Element e) {
        return excluded(e) || CommentExtractor.inside(e) || Set.of("figure", "figcaption", "h1", "h2", "h3", "h4", "h5", "h6", "button", "textarea", "select").contains(e.normalName())
            || (e.hasAttr("contenteditable") && !e.attr("contenteditable").equals("false"))
            || (Set.of("span", "a").contains(e.normalName()) && !e.select("img").isEmpty());
    }
    private void collect(Element element, List<Segment> output) {
        if (omit(element)) return;
        var inline = new ArrayList<Node>();
        flatten(element, inline);
        var chunks = new ArrayList<List<Node>>();
        var current = new ArrayList<Node>();
        int breaks = 0;
        for (Node node : inline) {
            if (node instanceof Element e && !e.normalName().equals("br")) {
                chunks.add(current); current = new ArrayList<>();
                chunks.add(List.of(e)); breaks = 0;
            } else if (node instanceof Element) {
                if (++breaks == 2) { chunks.add(current); current = new ArrayList<>(); }
                else current.add(node);
            } else {
                current.add(node);
                if (!normalized(((TextNode) node).getWholeText()).isEmpty()) breaks = 0;
            }
        }
        chunks.add(current);
        int index = 0;
        boolean whole = chunks.size() == 1 && !chunks.get(0).stream().anyMatch(n -> n instanceof Element e && !e.normalName().equals("br"));
        for (var chunk : chunks) {
            if (chunk.size() == 1 && chunk.get(0) instanceof Element e && !e.normalName().equals("br")) { collect(e, output); continue; }
            StringBuilder text = new StringBuilder();
            var links = new LinkedHashSet<String>();
            for (Node node : chunk) {
                if (node instanceof TextNode t) {
                    text.append(t.getWholeText());
                    Element anchor = t.parent() != null ? t.parent().closest("a[href]") : null;
                    if (anchor != null && !normalized(t.getWholeText()).isEmpty()) links.add(anchor.absUrl("href"));
                } else text.append(' ');
            }
            String value = normalized(text.toString());
            String path = selector(element) + (whole ? "" : "::sf-paragraph(" + index + ")");
            index++;
            // Standalone promotional actions inside an inserted block are not article prose.
            // Citation lists remain eligible (including entirely linked citations).
            boolean action = value.matches(".*(?:바로가기|더보기|구독하기|로그인)[ >›»→]*$") && !links.isEmpty();
            if (!value.isEmpty() && !action) output.add(new Segment(path, value, List.copyOf(links)));
        }
    }
    private void flatten(Element root, List<Node> nodes) {
        for (Node node : root.childNodes()) {
            if (node instanceof TextNode) nodes.add(node);
            else if (node instanceof Element e) {
                if (omit(e) || BLOCKS.contains(e.normalName()) || e.normalName().equals("br")) nodes.add(e);
                else flatten(e, nodes);
            }
        }
    }

    // Scope extraction without cloning/removing nodes: source selectors must stay valid.
    private Element contentRoot(org.jsoup.nodes.Document document) {
        for (String selector : List.of("[itemprop~=articleBody]", "article", "main, [role=main]")) {
            Element best = null;
            int size = 0;
            for (Element candidate : document.select(selector)) {
                if (excluded(candidate)) continue;
                int candidateSize = contentSize(candidate);
                if (candidateSize > size) { best = candidate; size = candidateSize; }
            }
            if (best != null) return best;
        }
        // Plain documents may have no semantic container. Preserve the existing limits
        // rather than silently taking the first 200 items or dropping long paragraphs.
        return document.selectFirst("body") != null ? document.selectFirst("body") : document;
    }

    private int contentSize(Element root) {
        var segments = new ArrayList<Segment>();
        collect(root, segments);
        return segments.stream().mapToInt(s -> s.text().length()).sum();
    }

    // Repeated headline + publication-date rows describe a navigation feed, not
    // prose. Require all signals together; ordinary lists and citations stay intact.
    private boolean isDatedLinkList(Element element) {
        if (!Set.of("ul", "ol").contains(element.normalName())) return false;
        for (Element parent = element; parent != null; parent = parent.parent())
            if (Set.of("doc-bibliography", "doc-endnotes", "doc-footnote").contains(parent.attr("role"))) return false;
        var rows = element.children();
        if (rows.size() < 3) return false;
        var destinations = new HashSet<String>();
        for (Element row : rows) {
            if (!row.normalName().equals("li")) return false;
            var anchors = row.select("a[href]");
            if (anchors.size() != 1) return false;
            var anchor = anchors.first();
            String href = anchor.attr("href").trim();
            if (href.startsWith("#") || !destinations.add(href)) return false;
            int total = row.text().length();
            if (total == 0 || anchor.text().length() < total * 0.55) return false;
            boolean dated = !row.select("time[datetime]").isEmpty();
            for (Element sibling : row.children()) {
                if (sibling == anchor || !sibling.select("a").isEmpty()) continue;
                if (sibling.text().matches("\\d{4}[.\\-/]\\d{1,2}[.\\-/]\\d{1,2}(?:\\s+\\d{1,2}:\\d{2})?")) dated = true;
            }
            if (!dated) return false;
        }
        return true;
    }

    private boolean excluded(Element element) {
        for (Element e = element; e != null; e = e.parent()) {
            if (isDatedLinkList(e) || EXCLUDED.contains(e.normalName()) || e.hasAttr("data-scrollfact-root") || e.id().equals("scrollfact-root") || e.hasAttr("hidden") || "true".equals(e.attr("aria-hidden"))) return true;
        }
        return false;
    }
    static String selector(Element element) {
        var parts = new ArrayDeque<String>();
        for (Element e = element; e != null && !e.normalName().equals("#root"); e = e.parent()) {
            int position = 1;
            for (Element previous = e.previousElementSibling(); previous != null; previous = previous.previousElementSibling())
                if (previous.normalName().equals(e.normalName())) position++;
            String tag = e.normalName();
            long siblings = e.parent() == null ? 1 : e.parent().children().stream().filter(sibling -> sibling.normalName().equals(tag)).count();
            parts.addFirst(siblings > 1 ? tag + ":nth-of-type(" + position + ")" : tag);
        }
        return String.join(" > ", parts);
    }
}
