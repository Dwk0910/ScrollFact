package org.onamhs.scrollfact.analysis;

import static org.assertj.core.api.Assertions.*;
import org.jsoup.Jsoup;
import org.junit.jupiter.api.Test;

class ArticleScopeTest {
    private final HtmlParser parser = new HtmlParser();
    private final String url = "https://www.newspim.com/news/view/20261102000423";

    @Test void semanticBodyExcludesSurroundingMenusWithoutChangingSelectors() {
        String menus = "<li><a href='https://example.org/menu'>메뉴</a></li>".repeat(240);
        String html = "<body><div><ul>" + menus + "</ul></div><section itemprop='articleBody'>"
            + "<div><p>기사 첫 문단</p>"
            + "<p>기사 둘째 문단 <a href='https://example.org/evidence'>근거</a></p></div>"
            + "</section></body>";
        var result = parser.parse(html, url);
        assertThat(result.passages()).hasSize(2);
        assertThat(result.sourceUrls()).containsExactly("https://example.org/evidence");
        var original = Jsoup.parse(html);
        for (var passage : result.passages()) {
            assertThat(original.select(passage.selector())).hasSize(1);
            assertThat(original.select(passage.selector()).text()).isEqualTo(passage.text());
        }
    }

    @Test void relatedWidgetMovedInsideBodyBySiteScriptIsNotArticleContent() {
        String widget = "<div class='arbitrary-widget'><ul>"
            + java.util.stream.IntStream.range(0, 5).mapToObj(i -> "<li><a href='https://example.org/related/" + i + "'>충분히 긴 다른 기사 제목과 안내</a><span>2026.11.23</span></li>").collect(java.util.stream.Collectors.joining())
            + "</ul></div>";
        String html = "<div><p>원문 앞부분</p>" + widget + "<p>원문 뒷부분</p></div>";
        var result = parser.parse(html, url);
        assertThat(result.passages()).extracting(p -> p.text()).containsExactly("원문 앞부분", "원문 뒷부분");
        assertThat(result.sourceUrls()).isEmpty();
        var original = Jsoup.parse(html);
        for (var passage : result.passages())
            assertThat(original.select(passage.selector()).text()).isEqualTo(passage.text());
    }

    @Test void semanticArticleBodyWinsOverSurroundingPageAndHiddenContainers() {
        String html = "<div><li>사이트 메뉴</li>" + "<li>다른 글</li>".repeat(230) + "</div>"
            + "<article hidden><p>숨겨진 기사</p></article><main><article><div itemprop='articleBody'>"
            + "<p>본문 하나</p><blockquote><p>인용 본문</p></blockquote></div></article></main>";
        assertThat(parser.parse(html, "https://example.com/news").passages())
            .extracting(p -> p.text()).containsExactly("본문 하나", "인용 본문");
    }

    @Test void longActualArticleStillFailsRatherThanTruncating() {
        assertThatThrownBy(() -> parser.parse("<article>" + "<p>실제 본문</p>".repeat(201) + "</article>", url))
            .isInstanceOf(ApiFailure.class);
        assertThat(parser.parse("<article>" + "<p>실제 본문</p>".repeat(200) + "</article>", url).passages()).hasSize(200);
    }

    @Test void mainFallbackAndPlainDocumentRemainSupported() {
        assertThat(parser.parse("<div><li>메뉴</li></div><main><p>본문</p></main>", url).passages())
            .extracting(p -> p.text()).containsExactly("본문");
        assertThat(parser.parse("<p>본문</p><p>끝</p>", url).passages()).hasSize(2);
    }

    @Test void citationsListsAndShortParagraphsAreNotDiscardedForHavingLinks() {
        String rows = java.util.stream.IntStream.range(0, 4).mapToObj(i ->
            "<li><a href='https://example.org/paper/" + i + "'>근거 문헌 제목</a></li>")
            .collect(java.util.stream.Collectors.joining());
        String html = "<article><p>짧은 도입</p><ol>" + rows + "</ol><p>짧은 결론</p></article>";
        var result = parser.parse(html, "https://another.example/article");
        assertThat(result.passages()).hasSize(6);
        assertThat(result.sourceUrls()).hasSize(4);
    }

    @Test void identicalStructureWorksOnUnrelatedHostsAndWithoutSiteSpecificIds() {
        String html = "<main><article><section itemprop='articleBody'><p>첫 문단</p><p>둘째 문단</p></section></article></main>";
        var expected = parser.parse(html, "https://one.example/news").passages();
        assertThat(parser.parse(html, "https://two.example/story").passages()).isEqualTo(expected);
    }

    @Test void optionalDownloadedRegressionPage() throws Exception {
        String path = System.getenv("SCROLLFACT_TEST_HTML");
        org.junit.jupiter.api.Assumptions.assumeTrue(path != null);
        String html = java.nio.file.Files.readString(java.nio.file.Path.of(path));
        var original = Jsoup.parse(html);
        var result = parser.parse(html, url);
        assertThat(result.passages()).isNotEmpty().hasSizeLessThan(200);
        assertThat(result.passages()).allSatisfy(p -> {
            var node = original.selectFirst(p.selector());
            assertThat(node).isNotNull();
            assertThat(node.closest("#stockNewsBox")).isNull();
            assertThat(node.text()).isEqualTo(p.text());
        });
        System.out.println("NEWS_SITE_REGRESSION pageCandidates=" + original.select("p, li, blockquote").size()
            + " bodyPassages=" + result.passages().size() + " bodyCharacters="
            + result.passages().stream().mapToInt(p -> p.text().length()).sum() + " sources=" + result.sourceUrls().size());
    }
}
