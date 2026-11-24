package org.onamhs.scrollfact.analysis;

import static org.assertj.core.api.Assertions.*;
import static org.onamhs.scrollfact.analysis.AnalysisModels.*;
import static org.onamhs.scrollfact.analysis.ReaderModels.*;
import java.util.List;
import org.junit.jupiter.api.Test;

class ReaderPreservationTest {
    @Test void attributedArticleEndingIsPreservedWithoutInventingAnExplanationOrOpinionGauge() {
        String quote = "관계자는 “학생들이 스스로 답을 찾는 과정이 교육”이라면서 “끝까지 지원하겠다”고 말했다.";
        var input = new EvaluationInput(new DocumentInfo("https://example.org/article", "제목"),
            List.of(new Passage("p1", "article > p", quote), new Passage("p2", "footer", "기자 reporter@example.org")), List.of());
        var output = new Output(List.of(new Block("p1", "auxiliary", "", "", List.of()),
            new Block("p2", "auxiliary", "", "", List.of())), List.of());
        var fixed = ReaderContract.preserveAttributedSpeech(output, input);
        ReaderContract.validate(fixed, input);
        assertThat(fixed.blocks().get(0).kind()).isEqualTo("body");
        assertThat(fixed.blocks().get(0).summary()).isEqualTo(quote);
        assertThat(fixed.blocks().get(0).title()).contains("원문 보존");
        assertThat(fixed.blocks().get(1).kind()).isEqualTo("auxiliary");
        assertThat(fixed.perspectives()).isEmpty();
    }
}
