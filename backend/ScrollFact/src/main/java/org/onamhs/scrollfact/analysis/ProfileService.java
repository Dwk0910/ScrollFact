package org.onamhs.scrollfact.analysis;

import java.util.*;
import org.springframework.stereotype.Service;

@Service
public class ProfileService {
    private final LocalProfileRepository repository;
    private final SecretProtector secrets;
    private final ActiveReader reader;
    private String current;
    private String storageError = "";
    public ProfileService(LocalProfileRepository repository, SecretProtector secrets, ActiveReader reader) {
        this.repository = repository; this.secrets = secrets; this.reader = reader;
    }
    @jakarta.annotation.PostConstruct
    void restore() {
        var active = repository.findByActiveTrue();
        if (!active.isEmpty()) {
            current = active.get(0).id;
            try { activate(active.get(0)); }
            catch (ApiFailure e) { reader.configure("gemini", "", ""); storageError = e.getMessage(); }
        }
    }
    private void activate(LocalProfile p) {
        if (p.sealedKey == null) reader.configure("gemini", "", "");
        else reader.configure(p.provider, secrets.reveal(p.id + ":" + p.provider, p.sealedKey), p.model);
        storageError = "";
    }
    public synchronized Map<String,Object> login(String id) {
        if (id == null || !id.matches("[A-Za-z0-9가-힣_-]{1,32}")) throw new ApiFailure(400,"invalid_profile","ID는 한글·영문·숫자·_-로 1~32자 입력해 주세요.");
        var p = repository.findById(id).orElseGet(() -> new LocalProfile(id));
        // Resolve key before changing the active profile; failed unlock preserves old state.
        String key = p.sealedKey == null ? "" : secrets.reveal(p.id + ":" + p.provider, p.sealedKey);
        var old = repository.findByActiveTrue(); old.forEach(x -> x.active = false);
        p.active = true; old.removeIf(x -> x.id.equals(id)); old.add(p); repository.saveAllAndFlush(old);
        current = id; storageError = "";
        reader.configure(p.provider == null ? "gemini" : p.provider, key, p.model == null ? "" : p.model);
        return status();
    }
    public synchronized Map<String,Object> status() {
        if (current == null) return Map.of("id", "", "hasKey", false, "follow", true, "mode", "reader", "error", storageError);
        var p = repository.findById(current).orElseThrow();
        return Map.of("id", p.id, "hasKey", p.sealedKey != null, "provider", p.provider == null ? "gemini" : p.provider,
            "model", p.model == null ? "" : p.model, "follow", p.follow, "mode", p.mode, "error", storageError);
    }
    private LocalProfile require(String id) {
        if (id == null || current == null || !current.equals(id)) throw new ApiFailure(409,"profile_changed","계정이 변경됐습니다. 설정을 다시 열어 주세요.");
        return repository.findById(current).orElseThrow();
    }
    public synchronized String key(String id, String provider, String supplied) {
        var p = require(id);
        if (supplied != null && !supplied.isBlank()) return supplied;
        if (!Objects.equals(provider, p.provider) || p.sealedKey == null) throw new ApiFailure(400,"key_required","이 제공자의 API 키를 입력해 주세요.");
        return secrets.reveal(p.id + ":" + provider, p.sealedKey);
    }
    public synchronized void save(String id, String provider, String key, String model) {
        var p = require(id);
        String sealed = secrets.protect(p.id + ":" + provider, key);
        p.provider = provider; p.model = model; p.sealedKey = sealed;
        repository.saveAndFlush(p); reader.configure(provider, key, model); storageError = "";
    }
    public synchronized Map<String,Object> preferences(String id, boolean follow, String mode) {
        var p = require(id);
        if (mode == null || !Set.of("reader","diagnostic").contains(mode)) throw new ApiFailure(400,"invalid_mode","실행 모드를 확인해 주세요.");
        p.follow = follow; p.mode = mode; repository.saveAndFlush(p); return status();
    }
    public synchronized void forget(String id) {
        var p = require(id); p.sealedKey = null; p.model = null; p.provider = null;
        repository.saveAndFlush(p); reader.configure("gemini", "", ""); storageError = "";
    }
    public synchronized void logout() {
        var active = repository.findByActiveTrue(); active.forEach(x -> x.active = false); repository.saveAllAndFlush(active);
        current = null; reader.configure("gemini", "", ""); storageError = "";
    }
}
