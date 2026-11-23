package org.onamhs.scrollfact.analysis;

import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import static org.onamhs.scrollfact.analysis.AnalysisModels.*;
import static org.onamhs.scrollfact.analysis.ReaderModels.*;

@Component
public class ActiveReader {
    private final String provider;
    private final OpenAiReader openai;
    private final GeminiReader gemini;
    public ActiveReader(@Value("${scrollfact.ai.provider:openai}") String provider, OpenAiReader openai, GeminiReader gemini) {
        this.provider = provider.trim().toLowerCase(java.util.Locale.ROOT);
        if (!this.provider.equals("openai") && !this.provider.equals("gemini"))
            throw new IllegalArgumentException("SCROLLFACT_AI_PROVIDER must be openai or gemini");
        this.openai = openai; this.gemini = gemini;
    }
    private record Override(OpenAiReader openai, GeminiReader gemini) {}
    private volatile Override override;
    public synchronized void configure(String provider, String key, String model) {
        var mapper = new com.fasterxml.jackson.databind.ObjectMapper();
        override = provider.equals("gemini") ? new Override(null, new GeminiReader(key, model, mapper))
            : new Override(new OpenAiReader(key, model, mapper), null);
    }
    public boolean configured() { var o = override; return o != null ? (o.gemini() != null ? o.gemini().configured() : o.openai().configured()) : provider.equals("gemini") ? gemini.configured() : openai.configured(); }
    public Map<String, Object> status() { var o = override; return o != null ? (o.gemini() != null ? o.gemini().status() : o.openai().status()) : provider.equals("gemini") ? gemini.status() : openai.status(); }
    public Completion analyze(EvaluationInput input) throws Exception {
        var o = override; return o != null ? (o.gemini() != null ? o.gemini().analyze(input) : o.openai().analyze(input)) : provider.equals("gemini") ? gemini.analyze(input) : openai.analyze(input);
    }
}
