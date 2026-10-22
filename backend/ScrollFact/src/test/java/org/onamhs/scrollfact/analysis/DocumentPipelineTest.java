package org.onamhs.scrollfact.analysis;

import static org.onamhs.scrollfact.analysis.AnalysisModels.*;
import static org.assertj.core.api.Assertions.*;
import java.net.InetAddress;
import java.nio.charset.StandardCharsets;
import java.util.UUID;
import org.jsoup.Jsoup;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

class DocumentPipelineTest {
    @Test void originalSelectorsRemainValidWithExcludedAndNestedElements() {
        String html = "<html><body><p hidden>숨김</p><p>한글</p><ul><li><p>중첩 문단</p></li></ul><div data-scrollfact-root><p>확장 UI</p></div></body></html>";
        var parsed = new HtmlParser().parse(html, "https://example.com");
        assertThat(parsed.passages()).hasSize(2);
        var original = Jsoup.parse(html);
        for (var passage : parsed.passages()) {
            assertThat(original.select(passage.selector())).as(passage.selector()).hasSize(1);
            assertThat(original.select(passage.selector()).text()).isEqualTo(passage.text());
        }
        assertThat(parsed.passages().get(0).selector()).endsWith("p:nth-of-type(2)");
    }
    @Test void sourceNormalizationPreservesEncodedPathAndQuery() {
        var page = new HtmlParser().parse("<p>본문 <a href='https://example.org/a%2Fb?q=x%26y#part'>출처</a><a href='https://example.org/a%2Fb?q=x%26y#other'>같은 출처</a></p>", "https://example.com");
        assertThat(page.sourceUrls()).containsExactly("https://example.org/a%2Fb?q=x%26y");
    }
    @Test void limitsRejectWithoutSilentlyTruncatingDocument() throws Exception {
        var reader = new UploadReader(); String id = UUID.randomUUID().toString();
        byte[] raw = "<p>한글</p>".getBytes(StandardCharsets.UTF_8);
        var file = new MockMultipartFile("document", AnalysisApiTest.gzip(raw));
        var meta = new Metadata(id, "https://example.com", "제목", raw.length, "gzip");
        assertThat(reader.read(meta, id, file).html()).isEqualTo("<p>한글</p>");
        assertThatThrownBy(() -> reader.read(meta, "wrong", file)).isInstanceOfSatisfying(ApiFailure.class, e -> assertThat(e.status).isEqualTo(400));
        assertThatThrownBy(() -> reader.read(new Metadata(id, meta.url(), "제목", raw.length - 1, "gzip"), id, file)).isInstanceOf(ApiFailure.class);
        assertThatThrownBy(() -> reader.read(meta, id, new MockMultipartFile("document", raw))).isInstanceOf(ApiFailure.class);
        byte[] bomb = new byte[UploadReader.MAX_HTML + 1];
        var large = new MockMultipartFile("document", AnalysisApiTest.gzip(bomb));
        assertThatThrownBy(() -> reader.read(new Metadata(id, meta.url(), "제목", UploadReader.MAX_HTML, "gzip"), id, large)).isInstanceOfSatisfying(ApiFailure.class, e -> assertThat(e.status).isEqualTo(413));
        assertThatThrownBy(() -> new HtmlParser().parse("<p>내용</p>".repeat(201), meta.url())).isInstanceOf(ApiFailure.class);
    }
    @Test void rejectsInternalAndMetadataNetworksIncludingIpv6AndCgnat() throws Exception {
        for (String ip : new String[]{"127.0.0.1", "10.0.0.1", "192.168.1.1", "169.254.169.254", "100.100.100.200", "0.0.0.0", "::1", "fc00::1", "fe80::1", "64:ff9b::7f00:1"})
            assertThat(PublicSourceFetcher.publicAddress(InetAddress.getByName(ip))).as(ip).isFalse();
        assertThat(PublicSourceFetcher.publicAddress(InetAddress.getByName("8.8.8.8"))).isTrue();
        try (var fetcher = new PublicSourceFetcher()) {
            assertThat(fetcher.fetch("http://127.0.0.1:8080/private").available()).isFalse();
            assertThat(fetcher.fetch("file:///etc/passwd").available()).isFalse();
        }
    }
}
