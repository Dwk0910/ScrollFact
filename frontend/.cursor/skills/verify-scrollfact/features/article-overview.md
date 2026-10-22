# Article overview

Article overview shows the reading progress, the trust score distribution, every paragraph claim with its score, the terms for the current paragraph, and the collected sources. It fills the right column after an analysis.

## Sub-features

- `overview-progress` shows the current paragraph number, the total, and the remaining count.
- `overview-distribution` counts high, middle, and low trust scores.
- `overview-claims` lists one claim and score per paragraph and marks the current one.
- `overview-terms-sources` shows terms for the current paragraph and the deduped source links.

## How to get to it (user POV)

- Press `이 페이지 맥락/신뢰도 분석`, then read the right column.
- Press `다음 문단` in preview mode and watch the terms change.

## Driving it with drive.mjs

Preconditions:

- The doctor command passes every line.
- The panel analysis journey passes, since this column fills from the same press.

- **Check the sections.** Run `node .cursor/skills/verify-scrollfact/helpers/drive.mjs analyze`. The second assertion passes when the page shows `읽기 진행`, `신뢰도 분포`, `핵심 주장`, `용어`, and `출처`.
- **Proof.** Open the newest `analyze-*.png`. The right column shows the progress bar, three distribution counts, the claim list, terms, and sources.

## Gotchas

- Below a 760px panel width the two columns stack. A narrow screenshot still proves the sections exist, but not the side by side layout.
- Scores and sources are mock data that cycles every five paragraphs. Counts in the distribution change with the paragraph count, so assert section presence, not fixed numbers.
