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
    public boolean configured() { return provider.equals("gemini") ? gemini.configured() : openai.configured(); }
    public Map<String, Object> status() { return provider.equals("gemini") ? gemini.status() : openai.status(); }
    public Completion analyze(EvaluationInput input) throws Exception {
        return provider.equals("gemini") ? gemini.analyze(input) : openai.analyze(input);
    }
}
