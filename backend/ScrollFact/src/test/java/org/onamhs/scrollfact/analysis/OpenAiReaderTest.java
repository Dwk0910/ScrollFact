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

class OpenAiReaderTest {
    private final ObjectMapper mapper = new ObjectMapper();
    private final EvaluationInput input = new EvaluationInput(new DocumentInfo("https://example.com/article", "제목"),
        List.of(new Passage("p1", "article > p", "학생은 발표 기회가 필요하다고 말했다.")),
        List.of(new SourceDocument("https://example.org/source", "자료", "기관", "발표 기회가 제공되었다.", null)));
    private Output valid() { return new Output(List.of(new Block("p1", "body", "발표 기회", "학생은 발표 기회가 필요하다고 말합니다.",
        List.of(new Check("발표 기회가 필요", "opinion", "필요성에 대한 의견입니다.", List.of())))),
        List.of(new Perspective("발표 기회 요청", List.of(new Entry("p1", "발표 기회가 필요", "이유가 명시되지 않았습니다."))))); }

    @Test void structuredResponsesRequestAndUsageAreHandledWithoutSendingSelectors() throws Exception {
        var received = new AtomicReference<String>(); var auth = new AtomicReference<String>();
        var httpStatus = new AtomicInteger(200);
        var output = new AtomicReference<>(mapper.writeValueAsString(Map.of("status", "completed", "output",
            List.of(Map.of("type", "message", "content", List.of(Map.of("type", "output_text", "text", mapper.writeValueAsString(valid()))))),
            "usage", Map.of("input_tokens", 123, "output_tokens", 45))));
        var server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/responses", exchange -> {
            received.set(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
            auth.set(exchange.getRequestHeaders().getFirst("Authorization"));
            byte[] bytes = output.get().getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(httpStatus.get(), bytes.length); exchange.getResponseBody().write(bytes); exchange.close();
        }); server.start();
        try {
            var reader = new OpenAiReader("test-secret", "test-model", URI.create("http://127.0.0.1:" + server.getAddress().getPort() + "/responses"), mapper);
            var result = reader.analyze(input);
            assertThat(result.inputTokens()).isEqualTo(123); assertThat(result.outputTokens()).isEqualTo(45);
            var request = mapper.readTree(received.get());
            assertThat(request.path("store").asBoolean()).isFalse();
            assertThat(request.at("/text/format/strict").asBoolean()).isTrue();
            assertThat(request.path("input").asText()).doesNotContain("selector", "article > p");
            assertThat(auth.get()).isEqualTo("Bearer test-secret");
            assertThat(mapper.writeValueAsString(reader.status())).doesNotContain("test-secret");
            output.set("{\"status\":\"incomplete\",\"output\":[]}");
            assertThatThrownBy(() -> reader.analyze(input)).isInstanceOf(ApiFailure.class);
            output.set("{\"status\":\"completed\",\"output\":[{\"content\":[{\"type\":\"refusal\"}]}]}");
            assertThatThrownBy(() -> reader.analyze(input)).isInstanceOf(ApiFailure.class);
            httpStatus.set(429); output.set("secret upstream detail test-secret");
            assertThatThrownBy(() -> reader.analyze(input)).isInstanceOf(ApiFailure.class).hasMessageNotContaining("test-secret");
        } finally { server.stop(0); }
    }
    @Test void rejectsMissingIdsUnknownIdsInventedQuotesAndUnsupportedVerdicts() {
        assertThatCode(() -> OpenAiReader.validate(valid(), input)).doesNotThrowAnyException();
        assertThatThrownBy(() -> OpenAiReader.validate(new Output(List.of(), List.of()), input)).isInstanceOf(ApiFailure.class);
        for (String id : List.of("p1", "invented")) {
            var output = new Output(List.of(new Block(id, "body", "제목", "해설", List.of(new Check("없는 구절", "opinion", "이유", List.of())))), List.of());
            assertThatThrownBy(() -> OpenAiReader.validate(output, input)).isInstanceOf(ApiFailure.class);
        }
        var unsupported = new Output(List.of(new Block("p1", "body", "제목", "해설", List.of(new Check("발표 기회", "supported", "이유", List.of())))), List.of());
        assertThatThrownBy(() -> OpenAiReader.validate(unsupported, input)).isInstanceOf(ApiFailure.class);
        var fabricated = new Output(List.of(new Block("p1", "body", "제목", "해설", List.of(new Check("발표 기회", "supported", "이유", List.of(new Evidence("https://example.org/source", "없는 인용")))))), List.of());
        assertThatThrownBy(() -> OpenAiReader.validate(fabricated, input)).isInstanceOf(ApiFailure.class);
    }
    @Test void rejectsDuplicateOpinionsAndKeepsAuxiliaryOutOfPerspectives() {
        var v = valid();
        assertThatThrownBy(() -> OpenAiReader.validate(new Output(v.blocks(), List.of(v.perspectives().get(0), v.perspectives().get(0))), input)).isInstanceOf(ApiFailure.class);
        assertThatThrownBy(() -> OpenAiReader.validate(new Output(List.of(new Block("p1", "auxiliary", "", "", List.of())), v.perspectives()), input)).isInstanceOf(ApiFailure.class);
        assertThatCode(() -> OpenAiReader.validate(new Output(List.of(new Block("p1", "auxiliary", "", "", List.of())), List.of()), input)).doesNotThrowAnyException();
    }
    @Test void noKeyMeansNoCallAndNoFabricatedResult() {
        var reader = new OpenAiReader("", "", mapper);
        assertThat(reader.configured()).isFalse();
        assertThatThrownBy(() -> reader.analyze(input)).isInstanceOf(ApiFailure.class);
    }
}
