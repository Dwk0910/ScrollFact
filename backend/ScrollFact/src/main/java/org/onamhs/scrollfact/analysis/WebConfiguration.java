package org.onamhs.scrollfact.analysis;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.web.servlet.config.annotation.*;

@Configuration
@EnableScheduling
public class WebConfiguration implements WebMvcConfigurer {
    private final String[] origins;
    public WebConfiguration(@Value("${scrollfact.cors.origins:http://127.0.0.1:5173,http://localhost:5173,chrome-extension://*}") String origins) {
        this.origins = origins.split(",");
    }
    @Override public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/v1/**").allowedOriginPatterns(origins)
            .allowedMethods("GET", "POST", "DELETE", "OPTIONS")
            .allowedHeaders("Content-Type", "Idempotency-Key")
            .exposedHeaders("Location", "Retry-After").maxAge(3600);
    }
}
