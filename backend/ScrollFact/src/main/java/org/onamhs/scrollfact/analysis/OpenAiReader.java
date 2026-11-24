package org.onamhs.scrollfact.analysis;

import com.fasterxml.jackson.databind.*;
import java.net.URI;
import java.net.http.*;
import java.time.Duration;
import java.util.*;
import static org.onamhs.scrollfact.analysis.ReaderContract.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import static org.onamhs.scrollfact.analysis.AnalysisModels.*;
import static org.onamhs.scrollfact.analysis.ReaderModels.*;

@Component
public class OpenAiReader {
    private final String key;
    private final String model;
    private final URI endpoint;
    private final ObjectMapper mapper;
    private final HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10))
        .followRedirects(HttpClient.Redirect.NEVER).build();
    @org.springframework.beans.factory.annotation.Autowired
    public OpenAiReader(@Value("${scrollfact.openai.key:}") String key,
                        @Value("${scrollfact.openai.model:}") String model, ObjectMapper mapper) {
        this(key, model, URI.create("https://api.openai.com/v1/responses"), mapper);
    }
    // Package-private endpoint override is for local HTTP contract tests only.
    OpenAiReader(String key, String model, URI endpoint, ObjectMapper mapper) {
        this.key = key; this.model = model; this.endpoint = endpoint;
        this.mapper = mapper.copy().enable(DeserializationFeature.FAIL_ON_MISSING_CREATOR_PROPERTIES);
    }
    public boolean configured() { return !key.isBlank() && !model.isBlank(); }
    public Map<String, Object> status() {
        return Map.of("provider", "OpenAI", "configured", configured(), "model", model,
            "authentication", "server_api_key");
    }
    public Completion analyze(EvaluationInput input) throws Exception {
        if (!configured()) throw new ApiFailure(503, "reader_unconfigured", "설정에서 OpenAI 연결 상태를 확인해 주세요. 서버에 API 키와 모델 설정이 필요합니다.");
        var data = Map.of("document", input.document(), "blocks", input.passages().stream()
            .map(p -> Map.of("id", p.id(), "text", p.text())).toList(), "sources", input.sources().stream()
            .filter(SourceDocument::available).map(s -> Map.of("url", s.url(), "text", s.text())).toList());
        String content = mapper.writeValueAsString(data);
        if (content.length() > 120_000) throw new ApiFailure(422, "ai_input_too_large", "본문과 근거 자료가 이번 AI 처리 범위를 초과했습니다. 일부만 잘라 분석하지 않습니다.");
        var requestBody = Map.of("model", model, "store", false, "max_output_tokens", 16000,
            "instructions", INSTRUCTIONS, "input", content,
            "text", Map.of("format", Map.of("type", "json_schema", "name", "scrollfact_reader", "strict", true, "schema", schema())));
        var request = HttpRequest.newBuilder(endpoint).timeout(Duration.ofSeconds(180))
            .header("Authorization", "Bearer " + key).header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofByteArray(mapper.writeValueAsBytes(requestBody))).build();
        var response = client.send(request, info -> new LimitedBodySubscriber(2 * 1024 * 1024));
        if (response.statusCode() != 200) {
            String detail = switch(response.statusCode()) {
                case 401, 403 -> "OpenAI 인증에 실패했습니다. 서버 API 키와 권한을 확인해 주세요.";
                case 429 -> "OpenAI 사용 한도 또는 요청 한도에 도달했습니다. API 사용량을 확인해 주세요.";
                default -> "OpenAI 요청이 실패했습니다. 서버의 모델 설정과 연결을 확인해 주세요.";
            };
            throw new ApiFailure(502, "openai_failed", detail);
        }
        var envelope = mapper.readTree(response.body());
        if (!"completed".equals(envelope.path("status").asText()))
            throw new ApiFailure(502, "openai_incomplete", "AI 응답이 완성되지 않았습니다. 결과를 표시하지 않습니다.");
        StringBuilder json = new StringBuilder();
        for (var item : envelope.path("output")) for (var part : item.path("content")) {
            if ("refusal".equals(part.path("type").asText())) throw new ApiFailure(422, "openai_refused", "AI가 이 페이지의 분석을 제공하지 못했습니다.");
            if ("output_text".equals(part.path("type").asText())) json.append(part.path("text").asText());
        }
        if (json.isEmpty()) throw invalid();
        Output output;
        try { output = mapper.readValue(json.toString(), Output.class); validate(output, input); output = preserveParagraphs(output, input); }
        catch (ApiFailure e) { throw e; }
        catch (Exception e) { throw invalid(); }
        return new Completion(output, model, envelope.path("usage").path("input_tokens").asLong(),
            envelope.path("usage").path("output_tokens").asLong());
    }
}
