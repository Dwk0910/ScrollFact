package org.onamhs.scrollfact.analysis;

import java.io.IOException;
import java.net.http.HttpResponse;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import org.slf4j.LoggerFactory;

/** Retries explicit unavailable responses only, never ambiguous transport failures. */
final class GeminiRetry {
    @FunctionalInterface interface Send { HttpResponse<byte[]> run() throws IOException, InterruptedException; }
    @FunctionalInterface interface Sleep { void run(long millis) throws InterruptedException; }

    static HttpResponse<byte[]> send(String model, Send send) throws IOException, InterruptedException {
        return send(model, send, Thread::sleep);
    }

    static HttpResponse<byte[]> send(String model, Send send, Sleep sleep) throws IOException, InterruptedException {
        String requestId = UUID.randomUUID().toString();
        for (int attempt = 1; ; attempt++) {
            if (Thread.currentThread().isInterrupted()) throw new InterruptedException();
            var response = send.run();
            if (response.statusCode() != 503) return response;
            if (attempt == 3) {
                throw ProviderFailure.response("Gemini", model, 503, response.body(), attempt, requestId);
            }
            long delay = 1000L * (1L << (attempt - 1)) + ThreadLocalRandom.current().nextLong(251);
            LoggerFactory.getLogger(GeminiRetry.class).warn(
                "AI retry id={} provider=Gemini model={} http=503 attempt={} maxAttempts=3 delayMs={}",
                requestId, model, attempt, delay);
            sleep.run(delay);
        }
    }
}
