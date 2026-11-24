package org.onamhs.scrollfact.analysis;

import com.fasterxml.jackson.databind.*;
import java.net.URI;
import java.net.http.*;
import java.time.Duration;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import static org.onamhs.scrollfact.analysis.AnalysisModels.*;
import static org.onamhs.scrollfact.analysis.ReaderModels.*;
import static org.onamhs.scrollfact.analysis.ReaderContract.*;

@Component
public class GeminiReader {
    private final String key, model;
    private final URI endpoint;
    private final ObjectMapper mapper;
    private final HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10))
        .followRedirects(HttpClient.Redirect.NEVER).build();
    @org.springframework.beans.factory.annotation.Autowired
    public GeminiReader(@Value("${scrollfact.gemini.key:}") String key,
                        @Value("${scrollfact.gemini.model:}") String model, ObjectMapper mapper) {
        this(key, model, endpoint(model), mapper);
    }
    static URI endpoint(String model) {
        if (!model.isBlank() && !model.matches("[A-Za-z0-9._-]+"))
            throw new IllegalArgumentException("SCROLLFACT_GEMINI_MODEL must be a model ID without a path");
        return URI.create("https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent");
    }
    // Local HTTP contract tests only; production endpoint is fixed above.
    GeminiReader(String key, String model, URI endpoint, ObjectMapper mapper) {
        this.key = key; this.model = model; this.endpoint = endpoint;
        this.mapper = mapper.copy().enable(DeserializationFeature.FAIL_ON_MISSING_CREATOR_PROPERTIES);
    }
    public boolean configured() { return !key.isBlank() && !model.isBlank(); }
    public Map<String, Object> status() {
        return Map.of("provider", "Google Gemini", "configured", configured(), "model", model, "authentication", "server_api_key");
    }
    public Completion analyze(EvaluationInput input) throws Exception {
        if (!configured()) throw new ApiFailure(503, "reader_unconfigured", "서버에 Gemini API 키와 모델 설정이 필요합니다.");
        var data = Map.of("document", input.document(), "blocks", input.passages().stream()
            .map(p -> Map.of("id", p.id(), "text", p.text())).toList(), "sources", input.sources().stream()
            .filter(SourceDocument::available).map(s -> Map.of("url", s.url(), "text", s.text())).toList());
        String content = mapper.writeValueAsString(data);
        if (content.length() > 120_000) throw new ApiFailure(422, "ai_input_too_large", "본문과 근거 자료가 이번 AI 처리 범위를 초과했습니다. 일부만 잘라 분석하지 않습니다.");
        var body = Map.of("systemInstruction", Map.of("parts", List.of(Map.of("text", INSTRUCTIONS))),
            "contents", List.of(Map.of("role", "user", "parts", List.of(Map.of("text", content)))),
            "generationConfig", Map.of("responseMimeType", "application/json", "responseJsonSchema", schema(), "maxOutputTokens", 16000, "candidateCount", 1));
        var request = HttpRequest.newBuilder(endpoint).timeout(Duration.ofSeconds(180))
            .header("x-goog-api-key", key).header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofByteArray(mapper.writeValueAsBytes(body))).build();
        HttpResponse<byte[]> response;
        try { response = GeminiRetry.send(model, timeout -> client.send(HttpRequest.newBuilder(request, (name, value) -> true).timeout(timeout).build(), info -> new LimitedBodySubscriber(2 * 1024 * 1024))); }
        catch (java.io.IOException e) { throw ProviderFailure.transport("Gemini", model, e); }
        if (response.statusCode() != 200) throw ProviderFailure.response("Gemini", model, response.statusCode(), response.body());
        var envelope = mapper.readTree(response.body());
        var candidate = envelope.path("candidates").path(0);
        if (!"STOP".equals(candidate.path("finishReason").asText()))
            throw new ApiFailure(502, "gemini_incomplete", "Gemini가 완전한 분석을 반환하지 못했습니다. 차단되거나 길이 한도에 도달한 결과는 표시하지 않습니다.");
        StringBuilder json = new StringBuilder();
        for (var part : candidate.path("content").path("parts"))
            if (!part.path("thought").asBoolean(false) && part.has("text")) json.append(part.path("text").asText());
        Output output;
        try { output = mapper.readValue(json.toString(), Output.class); validate(output, input); output = preserveParagraphs(output, input); }
        catch (ApiFailure e) { throw e; }
        catch (Exception e) { throw invalid(); }
        var usage = envelope.path("usageMetadata");
        return new Completion(output, model, usage.path("promptTokenCount").asLong(),
            usage.path("candidatesTokenCount").asLong() + usage.path("thoughtsTokenCount").asLong());
    }
}
