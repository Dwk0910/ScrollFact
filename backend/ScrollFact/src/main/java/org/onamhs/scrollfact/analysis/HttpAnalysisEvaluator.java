package org.onamhs.scrollfact.analysis;

import static org.onamhs.scrollfact.analysis.AnalysisModels.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.DeserializationFeature;
import java.net.URI;
import java.net.http.*;
import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/** Optional adapter for an independently hosted provider. No vendor or fabricated scoring built in. */
@Component
public class HttpAnalysisEvaluator implements AnalysisEvaluator {
    private final String endpoint;
    private final String token;
    private final ObjectMapper mapper;
    private final HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10))
        .followRedirects(HttpClient.Redirect.NEVER).build();
    public HttpAnalysisEvaluator(@Value("${scrollfact.evaluator.url:}") String endpoint,
                                 @Value("${scrollfact.evaluator.token:}") String token, ObjectMapper mapper) {
        this.endpoint = endpoint;
        this.token = token;
        this.mapper = mapper.copy()
            .disable(DeserializationFeature.ACCEPT_FLOAT_AS_INT)
            .enable(DeserializationFeature.FAIL_ON_MISSING_CREATOR_PROPERTIES)
            .enable(DeserializationFeature.FAIL_ON_NULL_FOR_PRIMITIVES);
    }
    public boolean configured() { return !endpoint.isBlank(); }
    public Evaluation evaluate(EvaluationInput input) throws Exception {
        if (!configured()) throw new ApiFailure(503, "evaluator_unconfigured", "AI 분석기가 아직 연결되지 않았습니다.");
        var builder = HttpRequest.newBuilder(URI.create(endpoint)).timeout(Duration.ofSeconds(90))
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofByteArray(mapper.writeValueAsBytes(input)));
        if (!token.isBlank()) builder.header("Authorization", "Bearer " + token);
        var response = client.send(builder.build(), info -> new LimitedBodySubscriber(2 * 1024 * 1024));
        if (response.statusCode() != 200 || response.body().length > 2 * 1024 * 1024)
            throw new ApiFailure(502, "evaluation_failed", "AI 분석 서비스가 올바른 결과를 반환하지 않았습니다.");
        return mapper.readValue(response.body(), Evaluation.class);
    }
}
