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
