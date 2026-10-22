# ScrollFact verification map

This directory is the maintained source for verifying the user-facing behavior of the ScrollFact panel. Read the index before driving the app, then use the matching feature file as the recipe.

## Baseline preconditions

- Run everything from the `frontend` directory.
- `npm run build` has completed, so `dist/src/sidepanel/index.html` exists.
- Port 4175 is free. The drive helper starts its own preview server and refuses to touch a foreign one.
- Run `node .cursor/skills/verify-scrollfact/helpers/drive.mjs doctor` and require every line to pass.
- Never drive a preview server or Chrome profile that this verification run did not start.

## Driving conventions

- Start every recipe from the baseline state unless its preconditions say otherwise.
- Prefer visible button text over CSS selectors or DOM position. The panel has no test IDs.
- Treat every command as literal. Keep quoted names and flags unchanged.
- Run browser actions through `helpers/drive.mjs`. There is no other harness in this repo.
- Do not remove proof artifacts during cleanup.

## Proof and skip reporting

- Capture the user action and the resulting state, not only the final screen.
- UI proof is the assertion JSON plus a screenshot that shows the ScrollFact header.
- Record the journey name with every artifact. The helper already writes it into the JSON file name.
- Report an unreachable path with the attempted command and the unmet precondition.
- Do not report a skipped entry point as verified through a different path. The in-page panel feature is the standing example.

## Feature entry contract

Each feature file starts with an H1 title and one paragraph describing the user-visible behavior. It then uses exactly four H2 sections in this order.

1. `Sub-features` lists short IDs with one line for each behavior.
2. `How to get to it (user POV)` lists every user entry point.
3. `Driving it with drive.mjs` starts with `Preconditions:` and uses labeled bullets that pair each user action with an exact command and observable result.
4. `Gotchas` lists traps that can waste or invalidate a verification run.

Keep implementation details out of the map. Name only user paths, stable handles, required state, commands, and observable proof.

## Features

- [Panel analysis](./panel-analysis.md) covers the analyze button, the pre-read brief, neighbor summaries, and preview paragraph stepping.
- [Article overview](./article-overview.md) covers reading progress, the trust distribution, the claim list, terms, and collected sources.
- [Google login guard](./google-login-guard.md) covers the preview guard message and the extension-only login window.
- [In-page panel](./inpage-panel.md) covers the injected panel, its drag handle and collapse rail, and why this harness cannot prove them.
