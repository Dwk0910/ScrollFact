package org.onamhs.scrollfact.analysis;

import static org.onamhs.scrollfact.analysis.AnalysisModels.*;
import java.util.*;
import java.net.URI;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Element;
import org.springframework.stereotype.Component;

@Component
public class HtmlParser {
    private static final Set<String> EXCLUDED = Set.of("script", "style", "noscript", "nav", "header", "footer", "aside", "iframe", "form");
    public ParsedPage parse(String html, String url) {
        var document = Jsoup.parse(html, url);
        var scope = contentRoot(document);
        var passages = new ArrayList<Passage>();
        var links = new LinkedHashSet<String>();
        int characters = 0;
        // Never mutate the DOM before deriving selectors: nth-of-type must match the source.
        for (var element : scope.select("p, li, blockquote")) {
            if (excluded(element) || element.children().stream().anyMatch(e -> !e.select("p, li, blockquote").isEmpty())) continue;
            String text = element.text().trim();
            if (text.isEmpty()) continue;
            characters += text.length();
            if (passages.size() >= 200 || characters > 200_000)
                throw new ApiFailure(422, "document_too_complex", "선택한 본문 영역이 문단 200개 또는 20만 자를 초과했습니다. 본문 영역을 올바르게 인식했는지 확인이 필요합니다.");
            passages.add(new Passage("section-" + (passages.size() + 1), selector(element), text));
        }
        if (passages.isEmpty()) throw new ApiFailure(422, "no_passages", "분석할 문단을 찾지 못했습니다.");
        for (var link : scope.select("a[href]")) {
            if (excluded(link)) continue;
            try {
                URI uri = URI.create(link.absUrl("href")).normalize();
                if (!Set.of("http", "https").contains(uri.getScheme()) || uri.getHost() == null || uri.getUserInfo() != null) continue;
                String canonical = uri.getScheme().toLowerCase() + "://" + uri.getHost().toLowerCase()
                    + (uri.getPort() == -1 ? "" : ":" + uri.getPort())
                    + (uri.getRawPath().isEmpty() ? "/" : uri.getRawPath())
                    + (uri.getRawQuery() == null ? "" : "?" + uri.getRawQuery());
                if (canonical.equals(url.split("#", 2)[0])) continue;
                links.add(canonical);
                if (links.size() > 40) throw new ApiFailure(422, "too_many_sources", "외부 출처 링크 40개 상한을 초과했습니다. 일부만 확인하지 않습니다.");
            } catch (IllegalArgumentException ignored) { }
        }
        return new ParsedPage(List.copyOf(passages), List.copyOf(links));
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
        return document.body();
    }

    private int contentSize(Element root) {
        int size = 0;
        for (Element paragraph : root.select("p, li, blockquote")) {
            if (excluded(paragraph) || paragraph.children().stream().anyMatch(e -> !e.select("p, li, blockquote").isEmpty())) continue;
            int linked = paragraph.select("a").stream().mapToInt(a -> a.text().length()).sum();
            size += Math.max(0, paragraph.text().length() - linked);
        }
        return size;
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
