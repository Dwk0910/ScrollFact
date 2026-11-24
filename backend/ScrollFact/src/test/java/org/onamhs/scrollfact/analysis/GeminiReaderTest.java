package org.onamhs.scrollfact.analysis;

import static org.assertj.core.api.Assertions.*;
import static org.onamhs.scrollfact.analysis.AnalysisModels.*;
import static org.onamhs.scrollfact.analysis.ReaderModels.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpServer;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.atomic.*;
import org.junit.jupiter.api.Test;

class GeminiReaderTest {
    private final ObjectMapper mapper = new ObjectMapper();
    private final EvaluationInput input = new EvaluationInput(new DocumentInfo("https://example.com/article", "제목"),
        List.of(new Passage("p1", "article > p", "학생은 발표 기회가 필요하다고 말했다.")),
        List.of(new SourceDocument("https://example.org/source", "자료", "기관", "발표 기회가 제공되었다.", null)));
    private Output valid() { return new Output(List.of(new Block("p1", "body", "발표 기회", "학생은 발표 기회가 필요하다고 말합니다.",
        List.of(new Check("발표 기회가 필요", "opinion", "필요성에 대한 의견입니다.", List.of())))),
        List.of(new Perspective("발표 기회 요청", List.of(new Entry("p1", "발표 기회가 필요", "이유가 명시되지 않았습니다."))))); }

    @Test void geminiRequestValidatesOutputAndHandlesIncompleteBlockedAndQuotaErrors() throws Exception {
        var received = new AtomicReference<String>(); var auth = new AtomicReference<String>();
        var httpStatus = new AtomicInteger(200);
        var attempts = new AtomicInteger();
        var output = new AtomicReference<>(mapper.writeValueAsString(Map.of("candidates",
            List.of(Map.of("finishReason", "STOP", "content", Map.of("parts", List.of(Map.of("text", mapper.writeValueAsString(valid())))))),
            "usageMetadata", Map.of("promptTokenCount", 123, "candidatesTokenCount", 40, "thoughtsTokenCount", 5))));
        var server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/responses", exchange -> {
            received.set(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
            auth.set(exchange.getRequestHeaders().getFirst("x-goog-api-key"));
            byte[] bytes = output.get().getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(attempts.incrementAndGet() == 1 ? 503 : httpStatus.get(), bytes.length); exchange.getResponseBody().write(bytes); exchange.close();
        }); server.start();
        try {
            var reader = new GeminiReader("test-secret", "test-model", URI.create("http://127.0.0.1:" + server.getAddress().getPort() + "/responses"), mapper);
            var events = new ArrayList<AiProgress>();
            var image = new ImageInput(new ImageMaterial("image-1", "img", "https://example.org/a.png", "설명"), "image/png", "aW1hZ2U=", null);
            var result = reader.analyze(new EvaluationInput(input.document(), input.passages(), input.sources(), List.of(image), events::add));
            assertThat(events).extracting(AiProgress::stage).containsExactly("requesting", "retry_wait", "requesting", "validating");
            assertThat(attempts.get()).isEqualTo(2);
            assertThat(result.inputTokens()).isEqualTo(123); assertThat(result.outputTokens()).isEqualTo(45);
            var request = mapper.readTree(received.get());
            assertThat(request.at("/generationConfig/responseMimeType").asText()).isEqualTo("application/json");
            assertThat(request.at("/generationConfig/responseJsonSchema/properties/blocks").isObject()).isTrue();
            assertThat(request.at("/contents/0/parts/0/text").asText()).doesNotContain("selector", "article > p");
            assertThat(request.at("/contents/0/parts/2/inlineData/mimeType").asText()).isEqualTo("image/png");
            assertThat(request.at("/contents/0/parts/2/inlineData/data").asText()).isEqualTo("aW1hZ2U=");
            assertThat(auth.get()).isEqualTo("test-secret");
            assertThat(mapper.writeValueAsString(reader.status())).doesNotContain("test-secret");
            output.set("{\"candidates\":[{\"finishReason\":\"MAX_TOKENS\"}]}");
            assertThatThrownBy(() -> reader.analyze(input)).isInstanceOf(ApiFailure.class);
            output.set("{\"promptFeedback\":{\"blockReason\":\"SAFETY\"}}");
            assertThatThrownBy(() -> reader.analyze(input)).isInstanceOf(ApiFailure.class);
            httpStatus.set(429); output.set("secret upstream detail test-secret");
            assertThatThrownBy(() -> reader.analyze(input)).isInstanceOf(ApiFailure.class).hasMessageNotContaining("test-secret");
        } finally { server.stop(0); }
    }
    @Test void selectionDoesNotFallbackAndRejectsUnknownProvider() throws Exception {
        var openai = org.mockito.Mockito.mock(OpenAiReader.class);
        var gemini = org.mockito.Mockito.mock(GeminiReader.class);
        var selected = new ActiveReader("gemini", openai, gemini);
        selected.configured(); selected.status(); selected.analyze(input);
        org.mockito.Mockito.verify(gemini).analyze(input);
        org.mockito.Mockito.verifyNoInteractions(openai);
        assertThatThrownBy(() -> new ActiveReader("unknown", openai, gemini)).isInstanceOf(IllegalArgumentException.class);
        var missing = new GeminiReader("", "", mapper);
        assertThat(missing.configured()).isFalse();
        assertThatThrownBy(() -> missing.analyze(input)).isInstanceOf(ApiFailure.class);
        assertThatThrownBy(() -> new GeminiReader("secret", "../bad?key=x", mapper)).isInstanceOf(IllegalArgumentException.class);
    }
}
