# Panel analysis

Panel analysis lets a user press one button and see a pre-read brief, the previous and current and next paragraph lines, and a trust card for the paragraph in view. Preview mode steps through mock paragraphs with two buttons.

## Sub-features

- `analyze-run` fills the brief, neighbor lines, and trust card after one press.
- `analyze-step` moves the preview to the next and previous mock paragraph.
- `analyze-empty-neighbors` labels the first paragraph as having no previous paragraph.

## How to get to it (user POV)

- Press `이 페이지 맥락/신뢰도 분석` in the panel header.
- Press `다음 문단` and `이전 문단` in the preview notice box after an analysis.

## Driving it with drive.mjs

Preconditions:

- The doctor command passes every line.
- No preview server from a previous run is alive on port 4175.

- **Run analysis.** Press the analyze button. Run `node .cursor/skills/verify-scrollfact/helpers/drive.mjs analyze`. The first assertion passes when the page shows `분석 완료`, `읽기 전 요약`, `이전 문단 없음`, and `지금 읽는 문단`.
- **Step forward.** The same journey presses `다음 문단`. The last assertion passes when the current paragraph line shows the second mock claim about 수도권 인구.
- **Proof.** Open the newest `analyze-*.json` and `analyze-*.png` in the evidence directory. The JSON lists three passing assertions and the screenshot shows the ScrollFact header above the brief.

## Gotchas

- The analyze button also triggers a 350ms preview delay. Assertions that read the page too early see the ready text instead of results. The helper waits before reading.
- Preview paragraph text comes from mock claims. A passing run proves panel behavior, never real page parsing.
- The first mock claim has no decimal point. Sentence splitting at decimals needs its own fixture and is not covered by this journey.
