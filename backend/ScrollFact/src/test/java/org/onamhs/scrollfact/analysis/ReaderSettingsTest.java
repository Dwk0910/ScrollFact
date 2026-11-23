package org.onamhs.scrollfact.analysis;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import java.util.List;
import java.nio.charset.StandardCharsets;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class ReaderSettingsTest {
    @Test void verifiesModelBeforeApplyingAndNeverReturnsKey() throws Exception {
        var active = new ActiveReader("openai", mock(OpenAiReader.class), mock(GeminiReader.class));
        var catalog = mock(ModelCatalog.class);
        when(catalog.list("gemini", "test-secret")).thenReturn(List.of(new ModelCatalog.Model("gemini-test", "Test")));
        var controller = new ReaderSettingsController(active, catalog);
        var request = new MockHttpServletRequest(); request.setRemoteAddr("127.0.0.1");
        var config = new ReaderSettingsController.Configuration("gemini", "test-secret", "gravity");
        assertThatThrownBy(() -> controller.configure(config, request)).isInstanceOf(ApiFailure.class);
        var response = controller.configure(new ReaderSettingsController.Configuration("gemini", "test-secret", "gemini-test"), request);
        assertThat(response.getBody().toString()).contains("Google Gemini", "gemini-test").doesNotContain("test-secret");
        assertThat(config.toString()).doesNotContain("test-secret");
        request.setRemoteAddr("192.0.2.1");
        assertThatThrownBy(() -> controller.models(config, request)).isInstanceOf(ApiFailure.class);
        verify(catalog, times(2)).list("gemini", "test-secret");
    }
    @Test void errorReportsStatusWithoutProviderFreeTextOrSecrets() {
        var error = ProviderFailure.response("Gemini", "gravity", 404,
            "{\"error\":{\"status\":\"NOT_FOUND\",\"message\":\"secret article and key\"}}".getBytes(StandardCharsets.UTF_8));
        assertThat(error.getMessage()).contains("404", "NOT_FOUND", "오류 번호").doesNotContain("secret article and key");
    }
}
