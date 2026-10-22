package org.onamhs.scrollfact.analysis;

import static org.onamhs.scrollfact.analysis.AnalysisModels.*;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;

@Component
public class ResultAssembler {
    private static final Set<String> STATUSES = Set.of("high", "good", "caution", "low", "danger");
    public Result assemble(String id, Metadata meta, ParsedPage page, List<SourceDocument> sources, Evaluation evaluation) {
        if (evaluation == null || evaluation.overview() == null || evaluation.sections() == null) throw invalid();
        assessment(evaluation.overview().score(), evaluation.overview().status(), evaluation.overview().summary());
        var evidence = sources.stream().filter(SourceDocument::available).collect(Collectors.toMap(SourceDocument::url, Function.identity()));
        var byId = new HashMap<String, EvaluatedSection>();
        for (var section : evaluation.sections()) {
            if (section == null || section.id() == null || byId.put(section.id(), section) != null) throw invalid();
        }
        if (byId.size() != page.passages().size()) throw invalid();
        var resultSections = new ArrayList<Section>();
        for (var passage : page.passages()) {
            var section = byId.get(passage.id());
            if (section == null || blank(section.title()) || section.reasons() == null || section.sourceUrls() == null) throw invalid();
            assessment(section.score(), section.status(), section.summary());
            if (section.reasons().stream().anyMatch(r -> r == null || blank(r.title()) || blank(r.detail()))) throw invalid();
            var links = new ArrayList<SourceLink>();
            for (String url : new LinkedHashSet<>(section.sourceUrls())) {
                var source = evidence.get(url);
                if (source == null) throw invalid(); // Do not publish invented or unfetched citations.
                links.add(new SourceLink(source.title(), source.publisher(), source.url()));
            }
            var reasons = new ArrayList<>(section.reasons());
            long failed = sources.stream().filter(s -> !s.available()).count();
            if (failed > 0) reasons.add(new Reason("확인하지 못한 출처", "페이지의 출처 중 " + failed + "개를 읽지 못했습니다. 해당 자료를 검증한 결과는 포함하지 않습니다."));
            if (sources.isEmpty()) reasons.add(new Reason("제시된 외부 출처 없음", "이 페이지에서 확인할 외부 출처 링크를 찾지 못했습니다. 독립적인 검색 검증은 아직 지원하지 않습니다."));
            resultSections.add(new Section(passage.id(), passage.selector(), section.title(), passage.text(),
                section.score(), section.status(), section.summary(), List.copyOf(reasons), List.copyOf(links)));
        }
        String title = meta.title().isBlank() ? meta.url() : meta.title();
        return new Result("1.0", id, meta.snapshotId(), new DocumentInfo(meta.url(), title), evaluation.overview(), List.copyOf(resultSections));
    }
    private static boolean blank(String value) { return value == null || value.isBlank(); }
    private static void assessment(int score, String status, String summary) {
        if (score < 0 || score > 100 || status == null || !STATUSES.contains(status) || blank(summary)) throw invalid();
    }
    private static ApiFailure invalid() { return new ApiFailure(502, "invalid_evaluation", "AI 분석 결과의 문단·점수·출처 형식이 올바르지 않습니다."); }
}
