package org.onamhs.scrollfact.analysis;

import static org.onamhs.scrollfact.analysis.AnalysisModels.*;
import static org.assertj.core.api.Assertions.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.concurrent.Flow;
import java.util.concurrent.atomic.*;
import org.junit.jupiter.api.Test;

class HttpEvaluatorTest {
    @Test void configurableAdapterSendsEvidenceAndStrictlyReadsScores() throws Exception {
        var received = new AtomicReference<String>();
        var token = new AtomicReference<String>();
        var output = new AtomicReference<>("{\"overview\":{\"score\":78,\"status\":\"good\",\"summary\":\"판단\"},\"sections\":[]}");
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/evaluate", exchange -> {
            received.set(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
            token.set(exchange.getRequestHeaders().getFirst("Authorization"));
            byte[] response = output.get().getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, response.length);
            exchange.getResponseBody().write(response); exchange.close();
        });
        server.start();
        try {
            var evaluator = new HttpAnalysisEvaluator("http://127.0.0.1:" + server.getAddress().getPort() + "/evaluate", "test-token", new ObjectMapper());
            var input = new EvaluationInput(new DocumentInfo("https://example.com", "제목"), List.of(new Passage("section-1", "body > p", "원문")), List.of());
            assertThat(evaluator.evaluate(input).overview().score()).isEqualTo(78);
            assertThat(received.get()).contains("passages", "원문");
            assertThat(token.get()).isEqualTo("Bearer test-token");
            output.set(output.get().replace("78", "78.9"));
            assertThatThrownBy(() -> evaluator.evaluate(input)).isInstanceOf(Exception.class);
            output.set("{\"overview\":{\"status\":\"good\",\"summary\":\"판단\"},\"sections\":[]}");
            assertThatThrownBy(() -> evaluator.evaluate(input)).isInstanceOf(Exception.class);
        } finally { server.stop(0); }
    }
    @Test void oversizedAdapterResponseStopsReceiving() {
        var body = new LimitedBodySubscriber(4); var cancelled = new AtomicBoolean();
        body.onSubscribe(new Flow.Subscription() {
            public void request(long count) {}
            public void cancel() { cancelled.set(true); }
        });
        body.onNext(List.of(ByteBuffer.wrap(new byte[5])));
        assertThat(cancelled).isTrue();
        assertThat(body.getBody().toCompletableFuture()).isCompletedExceptionally();
    }
}
