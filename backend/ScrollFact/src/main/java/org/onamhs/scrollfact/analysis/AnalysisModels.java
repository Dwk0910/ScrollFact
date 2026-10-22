package org.onamhs.scrollfact.analysis;

import java.util.List;

public final class AnalysisModels {
    private AnalysisModels() {}
    public record Metadata(String snapshotId, String url, String title, long htmlBytes, String encoding, String mode) {
        public Metadata { if (mode == null) mode = "analysis"; }
        public Metadata(String snapshotId, String url, String title, long htmlBytes, String encoding) {
            this(snapshotId, url, title, htmlBytes, encoding, "analysis");
        }
    }
    public record SourceProgress(int completed, Integer total, int failed) {}
    public record JobView(String analysisId, String snapshotId, String status, String phase,
                          SourceProgress sources, String error) {}
    public record DocumentInfo(String url, String title) {}
    public record Assessment(int score, String status, String summary) {}
    public record Reason(String title, String detail) {}
    public record SourceLink(String title, String publisher, String url) {}
    public record Section(String id, String selector, String title, String excerpt, int score,
                          String status, String summary, List<Reason> reasons, List<SourceLink> sources) {}
    public record Result(String schemaVersion, String analysisId, String snapshotId, DocumentInfo document,
                         Assessment overview, List<Section> sections) {}
    public record DiagnosticSource(String url, String title, int textCharacters, String failure) {}
    public record DiagnosticResult(String schemaVersion, String kind, String analysisId, String snapshotId,
                                   DocumentInfo document, long htmlBytes, List<Passage> passages,
                                   List<DiagnosticSource> sources) {}
    public record Passage(String id, String selector, String text) {}
    public record ParsedPage(List<Passage> passages, List<String> sourceUrls) {}
    public record SourceDocument(String url, String title, String publisher, String text, String failure) {
        public boolean available() { return failure == null; }
    }
    public record EvaluationInput(DocumentInfo document, List<Passage> passages, List<SourceDocument> sources) {}
    public record EvaluatedSection(String id, String title, int score, String status, String summary,
                                   List<Reason> reasons, List<String> sourceUrls) {}
    public record Evaluation(Assessment overview, List<EvaluatedSection> sections) {}
}
