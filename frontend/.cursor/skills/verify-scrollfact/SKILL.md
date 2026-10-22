---
name: verify-scrollfact
description: Verify the ScrollFact Chrome extension panel (React side panel page) in a real browser. Use when proving panel behavior after a frontend change: page analysis flow, article overview, Google login guard, or the in-page panel limits.
---

# Verify ScrollFact

ScrollFact is a Chrome MV3 extension. The user touches two things. The first is the panel page at `src/sidepanel/index.html`, which also runs over plain HTTP in preview mode with mock paragraphs. The second is the in-page panel that the content script injects into a web page as an iframe. This skill drives the first one end to end. The second one needs a manually loaded unpacked extension and is documented as a limit, not faked.

## Launch

Run these commands from the `frontend` directory.

1. Build the exact artifact that ships. Run `npm run build`. The build must print `dist/src/sidepanel/index.html` in its output list.
2. Start the preview server. Run `npm run preview -- --port 4175 --strictPort`. Ready means `http://localhost:4175/src/sidepanel/index.html` answers 200 and renders the ScrollFact header. The preview root path `/` answers 404 by design. The CRXJS build does not emit a root `index.html` into `dist`.
3. Teardown kills only the preview process this run started. The helper in this skill records the child process IDs it spawned and kills those. Never kill by process name.

The helper does steps 2 and 3 itself. An agent usually runs only the helper.

## Doctor

Run `node .cursor/skills/verify-scrollfact/helpers/drive.mjs doctor`. It checks four things and prints one line per check. Node is on PATH. The Chrome executable exists at `C:\Program Files\Google\Chrome\Application\chrome.exe` or at the path in `CHROME_PATH`. Port 4175 is free or already serves the ScrollFact panel page. `dist/src/sidepanel/index.html` exists, which proves a build ran. Any failed line means stop and fix that first.

## Drive

Run the helper from the `frontend` directory.

- `node .cursor/skills/verify-scrollfact/helpers/drive.mjs analyze` drives the analysis journey in the features map.
- `node .cursor/skills/verify-scrollfact/helpers/drive.mjs login-guard` drives the Google login guard journey.

The helper starts its own preview server on port 4175 and its own headless Chrome with a temporary user profile under the system temp directory. It navigates to the panel page, clicks buttons by their visible Korean text, reads the rendered page text, and asserts the end states named in the feature files. It exits 0 only when every assertion in the journey passed. Two runs cannot share port 4175 or the Chrome debug port 9334, so run journeys one at a time.

Stable handles in this repo are the visible button texts `이 페이지 맥락/신뢰도 분석`, `Google로 로그인`, `이전 문단`, and `다음 문단`, plus the route path `/src/sidepanel/index.html`. The panel has no test IDs. Do not add selectors based on DOM position.

## Evidence

Each journey writes two files into `.cursor/skills/verify-scrollfact/evidence/`. The JSON file records the journey name, every assertion with pass or fail, and the exit state of the page. The PNG file is a screenshot taken after the last action, with the ScrollFact header visible. A proof must show the action and the resulting state. The JSON assertions cover the resulting text, and the screenshot covers what the user sees. Preview mode uses mock paragraphs by design. That mock is the production boundary for this page, so preview proof covers panel behavior only. It never proves content script injection, scroll tracking on a real page, or the Google login window.

## Cleanup

The helper kills the Chrome and preview processes it started and deletes its temporary Chrome profile. Evidence files stay. If a run fails midway, rerun the same journey. The helper refuses to start when port 4175 already serves something that is not the ScrollFact panel, and it says so instead of killing a foreign process.

## Helpers

`helpers/drive.mjs` is the only helper. Its invocation is shown in the Drive section. It takes one argument, a journey name or `doctor`. It prints assertion results to stdout and writes evidence files as described above.
