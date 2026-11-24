package org.onamhs.scrollfact.analysis;

import org.junit.jupiter.api.Test;
import com.sun.net.httpserver.HttpServer;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.*;
import java.util.List;
import org.springframework.mock.web.MockHttpServletRequest;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class GeminiConnectionTest {
    @Test void catalogPresenceDoesNotSaveGenerationBlockedModel() throws Exception {
        var reader=mock(ActiveReader.class);var catalog=mock(ModelCatalog.class);var profiles=mock(ProfileService.class);
        when(profiles.key("alice","gemini","")).thenReturn("test-secret");
        when(catalog.list("gemini","test-secret")).thenReturn(List.of(new ModelCatalog.Model("gemini-2.5-flash-lite","Legacy")));
        doThrow(new ApiFailure(502,"provider_failed","new users blocked")).when(catalog).verify("gemini","test-secret","gemini-2.5-flash-lite");
        var controller=new ReaderSettingsController(reader,catalog,profiles);var request=new MockHttpServletRequest();request.setRemoteAddr("127.0.0.1");
        assertThatThrownBy(()->controller.configure(new ReaderSettingsController.Configuration("gemini","","gemini-2.5-flash-lite","alice"),request)).isInstanceOf(ApiFailure.class);
        verify(profiles,never()).save(anyString(),anyString(),anyString(),anyString());
    }
    @Test void performsRealGenerationCheckAndReportsNewUserRestrictionSafely() throws Exception {
        var status=new AtomicInteger(200);var requestBody=new AtomicReference<String>();
        var output=new AtomicReference<>("{\"candidates\":[{\"finishReason\":\"STOP\",\"content\":{\"parts\":[{\"text\":\"{\\\"ok\\\":true}\"}]}}]}");
        var server=HttpServer.create(new InetSocketAddress("127.0.0.1",0),0);
        server.createContext("/v1beta/models/test:generateContent",e->{
            requestBody.set(new String(e.getRequestBody().readAllBytes(),StandardCharsets.UTF_8));
            var bytes=output.get().getBytes(StandardCharsets.UTF_8);e.sendResponseHeaders(status.get(),bytes.length);e.getResponseBody().write(bytes);e.close();
        });server.start();
        try {
            var catalog=new ModelCatalog();var uri=URI.create("http://127.0.0.1:"+server.getAddress().getPort()+"/v1beta/models/test:generateContent");
            catalog.verifyGemini("test-secret","test",uri);
            assertThat(requestBody.get()).contains("responseJsonSchema","maxOutputTokens").doesNotContain("test-secret");
            status.set(404);output.set("{\"error\":{\"status\":\"NOT_FOUND\",\"message\":\"This model is no longer available to new users. Please update your code to use models/gemini-3.5-flash-lite. test-secret\"}}");
            assertThatThrownBy(()->catalog.verifyGemini("test-secret","test",uri)).isInstanceOf(ApiFailure.class).hasMessageContaining("신규 사용자").hasMessageContaining("gemini-3.5-flash-lite").hasMessageNotContaining("test-secret");
            status.set(200);output.set("{\"candidates\":[{\"finishReason\":\"MAX_TOKENS\"}]}");
            assertThatThrownBy(()->catalog.verifyGemini("test-secret","test",uri)).isInstanceOf(ApiFailure.class);
            output.set("{\"candidates\":[{\"finishReason\":\"STOP\",\"content\":{\"parts\":[{\"text\":\"not-json\"}]}}]}");
            assertThatThrownBy(()->catalog.verifyGemini("test-secret","test",uri)).isInstanceOf(ApiFailure.class);
        } finally {server.stop(0);}
        assertThat(GeminiReader.endpoint("gemini-3.5-flash-lite").toString()).isEqualTo("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent");
    }
}
