package org.onamhs.scrollfact.analysis;

import java.util.Map;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/v1/reader")
public class ReaderSettingsController {
    private final ActiveReader reader;
    private final ModelCatalog catalog;
    private final ProfileService profiles;
    public ReaderSettingsController(ActiveReader reader, ModelCatalog catalog, ProfileService profiles) { this.reader = reader; this.catalog = catalog; this.profiles = profiles; }
    public record Configuration(String provider, String apiKey, String model, String profileId) {
        @Override public String toString() { return "Configuration[redacted]"; }
    }
    private void local(jakarta.servlet.http.HttpServletRequest request) {
        if (!java.util.Set.of("127.0.0.1", "::1", "0:0:0:0:0:0:0:1").contains(request.getRemoteAddr()))
            throw new ApiFailure(403, "local_settings_only", "AI 설정은 서버와 같은 컴퓨터에서만 변경할 수 있습니다.");
    }
    @PostMapping(value="/models", consumes="application/json")
    public ResponseEntity<?> models(@RequestBody Configuration config, jakarta.servlet.http.HttpServletRequest request) throws Exception {
        local(request);
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(catalog.list(config.provider(), profiles.key(config.profileId(), config.provider(), config.apiKey())));
    }
    @PostMapping(value="/configuration", consumes="application/json")
    public ResponseEntity<?> configure(@RequestBody Configuration config, jakarta.servlet.http.HttpServletRequest request) throws Exception {
        local(request);
        String key = profiles.key(config.profileId(), config.provider(), config.apiKey());
        var models = catalog.list(config.provider(), key);
        if (models.stream().noneMatch(m -> m.id().equals(config.model()))) throw new ApiFailure(400, "unknown_model", "모델 목록에서 사용할 모델을 선택해 주세요.");
        profiles.save(config.profileId(), config.provider(), key, config.model());
        return status();
    }
    public record ProfileInput(String id, boolean follow, String mode) {}
    @GetMapping("/profile")
    public ResponseEntity<?> profile(jakarta.servlet.http.HttpServletRequest request) {
        local(request); return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(profiles.status());
    }
    @PostMapping(value="/profile/login", consumes="application/json")
    public ResponseEntity<?> login(@RequestBody ProfileInput input, jakarta.servlet.http.HttpServletRequest request) {
        local(request); return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(profiles.login(input.id()));
    }
    @PostMapping(value="/profile/logout", consumes="application/json")
    public ResponseEntity<?> logout(jakarta.servlet.http.HttpServletRequest request) {
        local(request); profiles.logout(); return ResponseEntity.noContent().build();
    }
    @PostMapping(value="/profile/preferences", consumes="application/json")
    public ResponseEntity<?> preferences(@RequestBody ProfileInput input, jakarta.servlet.http.HttpServletRequest request) {
        local(request); return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(profiles.preferences(input.id(), input.follow(), input.mode()));
    }
    @PostMapping(value="/profile/forget-key", consumes="application/json")
    public ResponseEntity<?> forget(@RequestBody ProfileInput input, jakarta.servlet.http.HttpServletRequest request) {
        local(request); profiles.forget(input.id()); return ResponseEntity.noContent().build();
    }
    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> status() {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(reader.status());
    }
}
