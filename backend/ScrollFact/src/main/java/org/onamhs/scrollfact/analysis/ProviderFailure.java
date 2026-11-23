package org.onamhs.scrollfact.analysis;

import java.util.UUID;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.LoggerFactory;

final class ProviderFailure {
    static ApiFailure transport(String provider, String model, java.io.IOException failure) {
        String id = UUID.randomUUID().toString();
        String kind = failure instanceof java.net.http.HttpTimeoutException ? "TIMEOUT" : "NETWORK_ERROR";
        LoggerFactory.getLogger(ProviderFailure.class).warn("AI error id={} provider={} model={} transport={}", id, provider, model, kind);
        return new ApiFailure(502, "provider_transport", provider + " " + kind + " · 통신에 실패했습니다. (오류 번호 " + id + ")");
    }
    static ApiFailure response(String provider, String model, int http, byte[] body) {
        String status = "UNKNOWN";
        String classification = "HTTP_ERROR";
        String replacement = "";
        try {
            var error = new ObjectMapper().readTree(body).path("error");
            String value = error.path("status").asText();
            String message = error.path("message").asText();
            if (http == 404 && message.contains("no longer available to new users")) {
                classification = "MODEL_UNAVAILABLE_TO_NEW_USERS";
                var match = java.util.regex.Pattern.compile("use models/([A-Za-z0-9._-]{1,100})").matcher(message);
                if (match.find()) replacement = match.group(1);
            }
            if (value.matches("[A-Z_]{1,64}")) status = value;
        } catch (Exception ignored) { }
        String reason = switch(http) {
            case 400 -> "요청 형식 또는 API 키를 확인해 주세요.";
            case 401, 403 -> "API 키 인증 또는 권한이 거부됐습니다.";
            case 404 -> "해당 모델이나 API 경로를 찾지 못했습니다. 모델 목록에서 다시 선택해 주세요.";
            case 429 -> "사용량 또는 요청 한도에 도달했습니다.";
            default -> "제공자 요청에 실패했습니다.";
        };
        if (classification.equals("MODEL_UNAVAILABLE_TO_NEW_USERS")) reason = "선택한 모델은 신규 사용자에게 제공되지 않습니다." + (replacement.isEmpty() ? " 다른 모델을 선택해 주세요." : " Google 권장 대체 모델: " + replacement + ". 설정에서 변경해 주세요.");
        String id = UUID.randomUUID().toString();
        // Only allowlisted metadata: never log upstream free text, keys, or article contents.
        LoggerFactory.getLogger(ProviderFailure.class).warn("AI error id={} provider={} model={} http={} status={} reason={} suggestedModel={}", id, provider, model, http, status, classification, replacement);
        return new ApiFailure(502, "provider_failed", provider + " HTTP " + http + " · " + status + ": " + reason + " (오류 번호 " + id + ")");
    }
}
