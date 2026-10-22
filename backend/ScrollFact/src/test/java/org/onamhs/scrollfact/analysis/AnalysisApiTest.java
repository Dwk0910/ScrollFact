package org.onamhs.scrollfact.analysis;

import static org.onamhs.scrollfact.analysis.AnalysisModels.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.*;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.zip.GZIPOutputStream;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class AnalysisApiTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    @Autowired AnalysisRepository repository;
    @Autowired AnalysisService service;
    @MockitoBean AnalysisEvaluator evaluator;
    @MockitoBean PublicSourceFetcher fetcher;
    private static final String HTML = "<html><body><nav><p>메뉴</p></nav><article><p>검증할 주장 <a href='https://evidence.example/report'>출처</a></p><p>두 번째 문단 <a href='https://evidence.example/report#part'>같은 출처</a></p></article></body></html>";
    @DynamicPropertySource static void database(DynamicPropertyRegistry registry) throws Exception {
        String db = Files.createTempDirectory("scrollfact-api-test-").resolve("test.db").toString();
        registry.add("spring.datasource.url", () -> "jdbc:sqlite:" + db);
    }
    @BeforeEach void setup() throws Exception {
        when(evaluator.configured()).thenReturn(true);
        when(evaluator.evaluate(any())).thenAnswer(invocation -> evaluation(invocation.getArgument(0)));
        when(fetcher.fetch(anyString())).thenAnswer(invocation -> new SourceDocument(invocation.getArgument(0), "실제 출처", "evidence.example", "검증에 사용할 근거", null));
    }
    private Evaluation evaluation(EvaluationInput input) {
        return new Evaluation(new Assessment(78, "good", "종합 판단"), input.passages().stream().map(p ->
            new EvaluatedSection(p.id(), "문단 제목", 78, "good", "근거와 비교한 판단",
                List.of(new Reason("검증 이유", "테스트 분석기에서 반환한 근거")),
                input.sources().stream().filter(SourceDocument::available).map(SourceDocument::url).toList())).toList());
    }
    private JsonNode create(String snapshot, String html) throws Exception {
        byte[] raw = html.getBytes(StandardCharsets.UTF_8);
        var metadata = new Metadata(snapshot, "https://article.example/post", "한글 제목", raw.length, "gzip");
        var result = mvc.perform(multipart("/v1/analyses")
            .file(new MockMultipartFile("metadata", "metadata.json", "application/json", mapper.writeValueAsBytes(metadata)))
            .file(new MockMultipartFile("document", "document.html.gz", "application/gzip", gzip(raw)))
            .header("Idempotency-Key", snapshot))
            .andExpect(status().isAccepted()).andExpect(header().exists("Location"))
            .andExpect(header().string("Cache-Control", "no-store")).andReturn();
        return mapper.readTree(result.getResponse().getContentAsByteArray());
    }
    private JsonNode waitFor(String id, String status) throws Exception {
        for (int i = 0; i < 100; i++) {
            JsonNode value = mapper.readTree(mvc.perform(get("/v1/analyses/" + id)).andExpect(status().isOk()).andReturn().getResponse().getContentAsByteArray());
            if (value.path("status").asText().equals(status)) return value;
            Thread.sleep(30);
        }
        throw new AssertionError("Analysis never reached " + status);
    }
    @Test void createsPollsAndReadsResultWithDeduplicatedSources() throws Exception {
        String snapshot = UUID.randomUUID().toString();
        JsonNode created = create(snapshot, HTML);
        String id = created.path("analysisId").asText();
        JsonNode completed = waitFor(id, "completed");
        assertThat(completed.has("result")).isFalse();
        assertThat(completed.path("sources").path("total").asInt()).isEqualTo(1);
        mvc.perform(get("/v1/analyses/" + id + "/result")).andExpect(status().isOk())
            .andExpect(jsonPath("$.snapshotId").value(snapshot)).andExpect(jsonPath("$.sections.length()").value(2))
            .andExpect(jsonPath("$.sections[0].selector").value("html > body > article > p:nth-of-type(1)"))
            .andExpect(jsonPath("$.sections[0].sources[0].url").value("https://evidence.example/report"));
        verify(fetcher, times(1)).fetch("https://evidence.example/report");
    }
    @Test void sameKeyReusesJobAndChangedContentConflicts() throws Exception {
        String snapshot = UUID.randomUUID().toString();
        String id = create(snapshot, HTML).path("analysisId").asText();
        waitFor(id, "completed");
        assertThat(create(snapshot, HTML).path("analysisId").asText()).isEqualTo(id);
        byte[] raw = "<p>다른 내용</p>".getBytes(StandardCharsets.UTF_8);
        mvc.perform(multipart("/v1/analyses")
            .file(new MockMultipartFile("metadata", "m.json", "application/json", mapper.writeValueAsBytes(new Metadata(snapshot, "https://article.example/post", "한글 제목", raw.length, "gzip"))))
            .file(new MockMultipartFile("document", "d.gz", "application/gzip", gzip(raw))).header("Idempotency-Key", snapshot))
            .andExpect(status().isConflict()).andExpect(content().contentTypeCompatibleWith("application/problem+json"))
            .andExpect(jsonPath("$.code").value("idempotency_conflict"));
    }
    @Test void pendingResultIsConflictAndDeleteCancelsAndRemovesResource() throws Exception {
        CountDownLatch entered = new CountDownLatch(1), release = new CountDownLatch(1);
        doAnswer(invocation -> { entered.countDown(); release.await(); return evaluation(invocation.getArgument(0)); }).when(evaluator).evaluate(any());
        String id = create(UUID.randomUUID().toString(), HTML).path("analysisId").asText();
        try {
            assertThat(entered.await(3, TimeUnit.SECONDS)).isTrue();
            mvc.perform(get("/v1/analyses/" + id + "/result")).andExpect(status().isConflict());
            mvc.perform(delete("/v1/analyses/" + id)).andExpect(status().isNoContent());
            mvc.perform(delete("/v1/analyses/" + id)).andExpect(status().isNoContent());
            mvc.perform(get("/v1/analyses/" + id)).andExpect(status().isNotFound());
        } finally { release.countDown(); }
    }
    @Test void unconfiguredEvaluatorReturns503WithoutFabricatingResults() throws Exception {
        when(evaluator.configured()).thenReturn(false);
        String id = UUID.randomUUID().toString(); byte[] raw = HTML.getBytes(StandardCharsets.UTF_8);
        mvc.perform(multipart("/v1/analyses")
            .file(new MockMultipartFile("metadata", "m.json", "application/json", mapper.writeValueAsBytes(new Metadata(id, "https://example.com", "제목", raw.length, "gzip"))))
            .file(new MockMultipartFile("document", "d.gz", "application/gzip", gzip(raw))).header("Idempotency-Key", id))
            .andExpect(status().isServiceUnavailable()).andExpect(jsonPath("$.code").value("evaluator_unconfigured"));
        assertThat(repository.findBySnapshotId(id)).isEmpty();
    }
    @Test void invalidEvaluationFailsInsteadOfPublishingInventedCitations() throws Exception {
        doAnswer(invocation -> {
            EvaluationInput input = invocation.getArgument(0);
            return new Evaluation(new Assessment(78, "good", "요약"), input.passages().stream().map(p -> new EvaluatedSection(p.id(), "제목", 78, "good", "요약", List.of(), List.of("https://invented.example"))).toList());
        }).when(evaluator).evaluate(any());
        String id = create(UUID.randomUUID().toString(), HTML).path("analysisId").asText();
        JsonNode job = waitFor(id, "failed");
        assertThat(job.path("error").asText()).contains("형식");
        mvc.perform(get("/v1/analyses/" + id + "/result")).andExpect(status().isConflict());
    }
    @Test void restartMarksInterruptedJobsAndExpiryRemovesOldResults() {
        var entity = new AnalysisEntity(); entity.id = UUID.randomUUID().toString(); entity.snapshotId = UUID.randomUUID().toString();
        entity.digest = "test"; entity.status = "running"; entity.phase = "extracting"; entity.createdAt = System.currentTimeMillis();
        repository.saveAndFlush(entity);
        service.recoverInterrupted();
        assertThat(service.get(entity.id).status()).isEqualTo("failed");
        entity = repository.findById(entity.id).orElseThrow(); entity.finishedAt = System.currentTimeMillis() - 31 * 60_000;
        repository.saveAndFlush(entity); service.expire();
        assertThat(repository.findById(entity.id)).isEmpty();
    }
    @Test void malformedMultipartUsesProblemDetails() throws Exception {
        mvc.perform(multipart("/v1/analyses").header("Idempotency-Key", UUID.randomUUID().toString()))
            .andExpect(status().isBadRequest()).andExpect(content().contentTypeCompatibleWith("application/problem+json"));
        mvc.perform(post("/v1/analyses").contentType("application/json").content("{}"))
            .andExpect(status().isUnsupportedMediaType());
    }
    static byte[] gzip(byte[] raw) throws Exception {
        var buffer = new ByteArrayOutputStream();
        try (var gzip = new GZIPOutputStream(buffer)) { gzip.write(raw); }
        return buffer.toByteArray();
    }
}
