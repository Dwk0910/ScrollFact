package org.onamhs.scrollfact.analysis;

import static org.onamhs.scrollfact.analysis.AnalysisModels.*;

/** Provider implementations receive parsed text and fetched evidence, never raw HTML. */
public interface AnalysisEvaluator {
    boolean configured();
    Evaluation evaluate(EvaluationInput input) throws Exception;
}
