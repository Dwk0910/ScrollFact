package org.onamhs.scrollfact.analysis;

import java.net.*;
import java.net.http.*;
import java.time.Duration;
import java.util.*;
import com.fasterxml.jackson.databind.*;
import org.springframework.stereotype.Component;

@Component
public class ModelCatalog {
    public record Model(String id, String name) {}
    private final HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).followRedirects(HttpClient.Redirect.NEVER).build();
    /** A catalog entry is not proof of per-project generation access. */
    public void verify(String provider, String key, String model) throws Exception {
        if (!provider.equals("gemini")) return;
        verifyGemini(key, model, GeminiReader.endpoint(model));
    }
    void verifyGemini(String key, String model, URI endpoint) throws Exception {
        var mapper = new ObjectMapper();
        var schema = Map.of("type", "object", "properties", Map.of("ok", Map.of("type", "boolean")), "required", List.of("ok"), "additionalProperties", false);
        var body = Map.of("contents", List.of(Map.of("parts", List.of(Map.of("text", "Return a JSON object with ok set to true.")))),
            "generationConfig", Map.of("maxOutputTokens", 1024, "responseMimeType", "application/json", "responseJsonSchema", schema));
        var request = HttpRequest.newBuilder(endpoint).timeout(Duration.ofSeconds(45)).header("x-goog-api-key", key)
            .header("Content-Type", "application/json").POST(HttpRequest.BodyPublishers.ofByteArray(mapper.writeValueAsBytes(body))).build();
        HttpResponse<byte[]> response;
        try { response = client.send(request, info -> new LimitedBodySubscriber(128 * 1024)); }
        catch (java.io.IOException e) { throw ProviderFailure.transport("Gemini", model, e); }
        if (response.statusCode() != 200) throw ProviderFailure.response("Gemini", model, response.statusCode(), response.body());
        var candidate = mapper.readTree(response.body()).path("candidates").path(0);
        if (!candidate.path("finishReason").asText().equals("STOP")) throw new ApiFailure(502,"model_probe_incomplete","모델 연결 검사가 완료되지 않았습니다. 기존 설정을 유지합니다.");
        var json = new StringBuilder();
        for (var part : candidate.path("content").path("parts")) if (!part.path("thought").asBoolean()) json.append(part.path("text").asText());
        try {
            if (!mapper.readTree(json.toString()).path("ok").asBoolean()) throw new IllegalArgumentException();
        } catch (Exception e) { throw new ApiFailure(502,"model_probe_invalid","모델이 올바른 JSON 응답을 반환하지 않았습니다. 기존 설정을 유지합니다."); }
    }
    public List<Model> list(String provider, String key) throws Exception {
        if (provider == null || !Set.of("gemini", "openai").contains(provider) || key == null || key.isBlank() || key.length() > 512 || key.chars().anyMatch(Character::isISOControl))
            throw new ApiFailure(400, "invalid_settings", "제공자와 API 키를 확인해 주세요.");
        boolean gemini = provider.equals("gemini");
        var models = new ArrayList<Model>(); String token = "";
        for (int page = 0; page < 10; page++) {
            String url = gemini ? "https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000" + (token.isEmpty() ? "" : "&pageToken=" + URLEncoder.encode(token, java.nio.charset.StandardCharsets.UTF_8)) : "https://api.openai.com/v1/models";
            var request = HttpRequest.newBuilder(URI.create(url)).timeout(Duration.ofSeconds(20))
                .header(gemini ? "x-goog-api-key" : "Authorization", gemini ? key : "Bearer " + key).GET().build();
            HttpResponse<byte[]> response;
        try { response = client.send(request, info -> new LimitedBodySubscriber(2 * 1024 * 1024)); }
        catch (java.io.IOException e) { throw ProviderFailure.transport(provider, "model-list", e); }
            if (response.statusCode() != 200) throw ProviderFailure.response(provider, "model-list", response.statusCode(), response.body());
            var root = new ObjectMapper().readTree(response.body());
            for (var m : root.path(gemini ? "models" : "data")) {
                String id = gemini ? m.path("name").asText().replaceFirst("^models/", "") : m.path("id").asText();
                boolean supported = !gemini;
                for (var method : m.path("supportedGenerationMethods")) if (method.asText().equals("generateContent")) supported = true;
                if (supported && id.matches("[A-Za-z0-9._:-]{1,128}")) models.add(new Model(id, m.path("displayName").asText(id)));
            }
            token = root.path("nextPageToken").asText();
            if (!gemini || token.isEmpty()) return models.stream().sorted(Comparator.comparing(Model::id)).toList();
        }
        throw new ApiFailure(502, "catalog_incomplete", "모델 목록이 너무 길어 완료하지 못했습니다.");
    }
}
