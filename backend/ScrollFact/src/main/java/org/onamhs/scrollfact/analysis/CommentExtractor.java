package org.onamhs.scrollfact.analysis;

import java.util.*;
import org.jsoup.nodes.Element;
import static org.onamhs.scrollfact.analysis.AnalysisModels.*;

/** Semantic markup first, then explicit widget adapters. Never infer a comment from page-wide prose. */
final class CommentExtractor {
    static final String ROOTS = "[itemtype$=/Comment], [itemprop=comment], [data-comment-id], .comment, .comment-item, .u_cbox_comment";
    static final String AREAS = "[itemprop=comment], [data-comments], #comments, .comments, .comment-list, .u_cbox, [itemtype$=/Comment]";
    static boolean inside(Element element) { return element.closest(ROOTS + "," + AREAS) != null; }
    static boolean hidden(Element element) {
        for (Element e = element; e != null; e = e.parent()) {
            String style = e.attr("style").replaceAll("\\s+", "").toLowerCase(Locale.ROOT);
            if (e.hasAttr("hidden") || e.attr("aria-hidden").equals("true") || style.contains("display:none") || style.contains("visibility:hidden") || e.closest("form,[contenteditable]:not([contenteditable=false]),[data-scrollfact-root]") != null) return true;
        }
        return false;
    }
    static List<Passage> extract(Element document) {
        var result = new ArrayList<Passage>();
        var seen = Collections.newSetFromMap(new IdentityHashMap<Element, Boolean>());
        int characters = 0;
        for (Element root : document.select(ROOTS)) {
            if (hidden(root)) continue;
            for (Element body : root.select("[itemprop=text], [data-comment-body], .comment-body, .comment-content, .u_cbox_contents")) {
                // Nested replies belong to their own comment, not their ancestor's text.
                if (body.closest(ROOTS) != root || hidden(body) || !seen.add(body)) continue;
                var clean = body.clone(); clean.select("script,style,form,button,[hidden],[aria-hidden=true],[contenteditable]:not([contenteditable=false])").remove();
                clean.getAllElements().stream().filter(CommentExtractor::hidden).toList().forEach(Element::remove);
                String text = clean.text().trim();
                if (text.isEmpty()) continue;
                characters += text.length();
                if (result.size() >= 200 || characters > 100_000) throw new ApiFailure(422, "comments_too_large", "화면에 불러온 댓글이 200개 또는 10만 자를 넘었습니다. 댓글 처리 범위를 확인해 주세요.");
                result.add(new Passage("comment-" + (result.size() + 1), HtmlParser.selector(body), text));
            }
        }
        return List.copyOf(result);
    }
}
