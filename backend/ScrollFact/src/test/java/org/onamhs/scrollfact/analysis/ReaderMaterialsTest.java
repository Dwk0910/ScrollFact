package org.onamhs.scrollfact.analysis;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;
import static org.onamhs.scrollfact.analysis.AnalysisModels.*;

class ReaderMaterialsTest {
    @Test void legacyEvaluatorPayloadDoesNotSerializeImagesOrProgressCallbacks() throws Exception {
        var input = new EvaluationInput(new DocumentInfo("https://example.org", "본문"), java.util.List.of(), java.util.List.of(),
            java.util.List.of(new ImageInput(new ImageMaterial("image-1", "img", "https://example.org/a.png", "캡션"), "image/png", "private-image-bytes", null)), event -> {});
        var json = new com.fasterxml.jackson.databind.ObjectMapper().readTree(new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsBytes(input));
        assertThat(json.size()).isEqualTo(3);
        assertThat(json.has("document") && json.has("passages") && json.has("sources")).isTrue();
    }
    @Test void collectsWidgetAndSemanticCommentsWithoutControlsDraftsOrHiddenDeletedText() {
        String html="<article><p>기사 원문</p><div itemprop='comment' itemscope itemtype='https://schema.org/Comment'><div itemprop='text'><p>첫 댓글</p><p>둘째 줄</p></div></div></article>"
            + "<div class='u_cbox'><span class='u_cbox_count'>63</span><form><div contenteditable='true'>비공개 초안</div></form>"
            + "<li class='u_cbox_comment'><b>닉네임</b><span class='u_cbox_contents'>다른 관점의 댓글</span><span class='u_cbox_delete_contents' style='display:none'>차단 문구</span><button>좋아요 25</button></li>"
            + "<li class='u_cbox_comment' hidden><span class='u_cbox_contents'>숨긴 댓글</span></li></div>";
        for(String url: new String[]{"https://one.example/news","https://two.example/story"}) {
            var page=new HtmlParser().parse(html,url);
            assertThat(page.passages()).extracting(Passage::text).containsExactly("기사 원문");
            assertThat(page.comments()).extracting(Passage::text).containsExactly("첫 댓글 둘째 줄","다른 관점의 댓글");
            assertThat(page.commentAreaDetected()).isTrue();
            assertThat(page.sourceUrls()).isEmpty();
        }
    }
    @Test void imagesOnlyComeFromArticleAndPreferCapturedCurrentSource() {
        var page=new HtmlParser().parse("<header><img src='https://example.org/logo.png'></header><article><p>본문</p>"
            +"<figure><img src='/placeholder.png' data-scrollfact-image-src='https://example.org/chart.png' alt='짧은 설명'><figcaption>그래프 설명</figcaption></figure>"
            +"<img src='https://example.org/hidden.png' hidden><button><img src='/icon.svg'></button>"
            +"<img src='/pixel.png' data-scrollfact-image-decorative='true'><div class='ad_promo'><img src='/promo.jpg'></div>"
            +"</article><aside><img src='https://example.org/recommend.jpg'></aside>","https://news.example/story");
        assertThat(page.images()).hasSize(1);
        assertThat(page.images().get(0).url()).isEqualTo("https://example.org/chart.png");
        assertThat(page.images().get(0).caption()).isEqualTo("그래프 설명");
        assertThat(page.sourceUrls()).isEmpty();
    }
    @Test void imageFetchRejectsPrivateAndNonHttpAddresses() throws Exception {
        try(var fetcher=new PublicSourceFetcher()) {
            for(String url:new String[]{"http://127.0.0.1/image.png","http://169.254.169.254/meta","file:///etc/passwd"})
                assertThat(fetcher.fetchImage(new ImageMaterial("image-1","img",url,"설명")).available()).isFalse();
        }
    }
    @Test void optionalUserCommentFixture() throws Exception {
        String path=System.getenv("SCROLLFACT_COMMENT_FIXTURE");org.junit.jupiter.api.Assumptions.assumeTrue(path!=null);
        String html="<article><p>기사 본문</p></article>"+java.nio.file.Files.readString(java.nio.file.Path.of(path));
        var page=new HtmlParser().parse(html,"https://unrelated.example/story");
        assertThat(page.comments()).hasSize(5);
        assertThat(page.passages()).hasSize(1);
        assertThat(page.comments()).noneSatisfy(c->assertThat(c.text()).containsAnyOf("MY댓글","차단한 이용자","PRIVATE_DRAFT"));
    }
}
