package org.onamhs.scrollfact.analysis;

import java.util.List;
import static org.onamhs.scrollfact.analysis.AnalysisModels.*;

public final class ReaderModels {
    private ReaderModels() {}
    public record Evidence(String url, String quote) {}
    public record Check(String quote, String status, String reason, List<Evidence> evidence) {}
    public record Block(String id, String kind, String title, String summary, List<Check> checks) {}
    public record Entry(String blockId, String quote, String reason) {}
    public record Perspective(String label, List<Entry> entries) {}
    public record Output(List<Block> blocks, List<Perspective> perspectives) {}
    public record Result(String schemaVersion, String kind, String analysisId, String snapshotId,
                         DocumentInfo document, long htmlBytes, List<Passage> passages,
                         List<Block> blocks, List<Perspective> perspectives, int excludedBlocks,
                         String model, long inputTokens, long outputTokens, List<Passage> comments, boolean commentAreaDetected, List<ImageResult> images) {}
    public record Completion(Output output, String model, long inputTokens, long outputTokens) {}
}
