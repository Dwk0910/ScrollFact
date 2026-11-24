package org.onamhs.scrollfact.analysis;

import java.io.IOException;
import java.time.Duration;
import java.util.function.LongSupplier;
import java.net.http.HttpResponse;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import org.slf4j.LoggerFactory;

/** Retries explicit unavailable responses only, never ambiguous transport failures. */
final class GeminiRetry {
    @FunctionalInterface interface Send { HttpResponse<byte[]> run(Duration timeout) throws IOException, InterruptedException; }
    @FunctionalInterface interface Sleep { void run(long millis) throws InterruptedException; }

    static HttpResponse<byte[]> send(String model, Send send) throws IOException, InterruptedException {
        return send(model, send, Thread::sleep);
    }

    static HttpResponse<byte[]> send(String model, Send send, Sleep sleep) throws IOException, InterruptedException {
        return send(model, send, sleep, System::nanoTime);
    }

    static HttpResponse<byte[]> send(String model, Send send, Sleep sleep, LongSupplier clock) throws IOException, InterruptedException {
        final long budget = Duration.ofMinutes(4).toNanos();
        final long startedAll = clock.getAsLong();
        String requestId = UUID.randomUUID().toString();
        for (int attempt = 1; ; attempt++) {
            if (Thread.currentThread().isInterrupted()) throw new InterruptedException();
            long started = System.nanoTime();
            long remaining = Math.max(1, budget - (clock.getAsLong() - startedAll));
            var response = send.run(Duration.ofNanos(Math.min(remaining, Duration.ofSeconds(180).toNanos())));
            LoggerFactory.getLogger(GeminiRetry.class).info(
                "AI response id={} provider=Gemini model={} attempt={} http={} elapsedMs={}",
                requestId, model, attempt, response.statusCode(), (System.nanoTime() - started) / 1_000_000);
            if (response.statusCode() != 503) return response;
            long delay = 1000L * (1L << (attempt - 1)) + ThreadLocalRandom.current().nextLong(251);
            if (attempt == 6 || clock.getAsLong() - startedAll + Duration.ofMillis(delay).toNanos() >= budget) {
                throw ProviderFailure.response("Gemini", model, 503, response.body(), attempt, requestId);
            }
            LoggerFactory.getLogger(GeminiRetry.class).warn(
                "AI retry id={} provider=Gemini model={} http=503 attempt={} maxAttempts=6 delayMs={}",
                requestId, model, attempt, delay);
            sleep.run(delay);
        }
    }
}
