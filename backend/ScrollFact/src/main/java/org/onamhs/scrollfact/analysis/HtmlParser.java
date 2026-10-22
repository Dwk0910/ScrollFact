package org.onamhs.scrollfact.analysis;

import static org.onamhs.scrollfact.analysis.AnalysisModels.*;
import java.util.*;
import java.net.URI;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Element;
import org.springframework.stereotype.Component;

@Component
public class HtmlParser {
    private static final Set<String> EXCLUDED = Set.of("script", "style", "noscript", "nav", "header", "footer", "aside", "iframe");
    public ParsedPage parse(String html, String url) {
        var document = Jsoup.parse(html, url);
        var passages = new ArrayList<Passage>();
        var links = new LinkedHashSet<String>();
        int characters = 0;
        // Never mutate the DOM before deriving selectors: nth-of-type must match the source.
        for (var element : document.select("p, li, blockquote")) {
            if (excluded(element) || element.children().stream().anyMatch(e -> !e.select("p, li, blockquote").isEmpty())) continue;
            String text = element.text().trim();
            if (text.isEmpty()) continue;
            characters += text.length();
            if (passages.size() >= 200 || characters > 200_000)
                throw new ApiFailure(422, "document_too_complex", "문단 200개 또는 본문 20만 자 상한을 초과했습니다. 일부만 분석하지 않습니다.");
            passages.add(new Passage("section-" + (passages.size() + 1), selector(element), text));
        }
        if (passages.isEmpty()) throw new ApiFailure(422, "no_passages", "분석할 문단을 찾지 못했습니다.");
        for (var link : document.select("a[href]")) {
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
    private boolean excluded(Element element) {
        for (Element e = element; e != null; e = e.parent()) {
            if (EXCLUDED.contains(e.normalName()) || e.hasAttr("data-scrollfact-root") || e.id().equals("scrollfact-root") || e.hasAttr("hidden") || "true".equals(e.attr("aria-hidden"))) return true;
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
