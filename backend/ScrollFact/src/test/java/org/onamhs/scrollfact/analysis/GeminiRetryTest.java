package org.onamhs.scrollfact.analysis;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import java.io.IOException;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;

class GeminiRetryTest {
    @SuppressWarnings("unchecked")
    private HttpResponse<byte[]> response(int status) {
        HttpResponse<byte[]> response = mock(HttpResponse.class);
        when(response.statusCode()).thenReturn(status);
        when(response.body()).thenReturn("{\"error\":{\"status\":\"UNAVAILABLE\",\"message\":\"secret upstream text\"}}".getBytes(StandardCharsets.UTF_8));
        return response;
    }
    @Test void recoversWithBoundedIncreasingDelays() throws Exception {
        var count = new AtomicInteger();
        var delays = new ArrayList<Long>();
        var result = GeminiRetry.send("test-model", () -> response(count.incrementAndGet() < 3 ? 503 : 200), delays::add);
        assertThat(result.statusCode()).isEqualTo(200);
        assertThat(count.get()).isEqualTo(3);
        assertThat(delays).hasSize(2);
        assertThat(delays.get(0)).isBetween(1000L, 1250L);
        assertThat(delays.get(1)).isBetween(2000L, 2250L);
    }
    @Test void stopsAfterThreeFailuresAndReportsSafeDetail() {
        var count = new AtomicInteger();
        assertThatThrownBy(() -> GeminiRetry.send("test-model", () -> { count.incrementAndGet(); return response(503); }, ms -> {}))
            .isInstanceOf(ApiFailure.class).hasMessageContaining("총 3회").hasMessageContaining("503")
            .hasMessageNotContaining("secret upstream text");
        assertThat(count.get()).isEqualTo(3);
    }
    @Test void doesNotRetryOtherStatusesOrTransportFailures() throws Exception {
        for (int status : new int[]{200, 400, 401, 403, 404, 429, 500}) {
            var count = new AtomicInteger();
            assertThat(GeminiRetry.send("test-model", () -> { count.incrementAndGet(); return response(status); }, ms -> { throw new AssertionError(); }).statusCode()).isEqualTo(status);
            assertThat(count.get()).isEqualTo(1);
        }
        assertThatThrownBy(() -> GeminiRetry.send("test-model", () -> { throw new IOException(); }, ms -> { throw new AssertionError(); }))
            .isInstanceOf(IOException.class);
    }
    @Test void cancellationDuringBackoffStopsBeforeNextRequest() {
        var count = new AtomicInteger();
        assertThatThrownBy(() -> GeminiRetry.send("test-model", () -> { count.incrementAndGet(); return response(503); }, ms -> { throw new InterruptedException(); }))
            .isInstanceOf(InterruptedException.class);
        assertThat(count.get()).isEqualTo(1);
    }
}
