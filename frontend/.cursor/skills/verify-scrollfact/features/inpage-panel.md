# In-page panel

The in-page panel is the panel a user actually reads with. The toolbar icon injects it into the right half of a web page, the left edge drags to resize it, and the collapse button folds it into a narrow rail. Scrolling the page moves the trust card to the paragraph at the center.

## Sub-features

- `panel-toggle` opens and closes the panel from the toolbar icon.
- `panel-resize` drags between 320px and 70 percent of the window, with a narrower floor on small windows.
- `panel-collapse` folds the panel to a rail and expands it again.
- `panel-scroll-sync` moves the active paragraph highlight and the trust card while the user scrolls.

## How to get to it (user POV)

- Click the ScrollFact toolbar icon on any http or https page.
- Drag the left edge of the opened panel.
- Press `접기` at the top of the panel, then press the `ScrollFact` rail button.

## Driving it with drive.mjs

Preconditions:

- The unpacked extension is loaded from `frontend/dist` in a Chrome profile a human controls.
- A long article page is open. The repo demo page at `/demo.html` on the dev server works.

- **No scripted drive exists.** This harness serves only the panel page over HTTP. It cannot click a toolbar icon or inject a content script. Record this feature as not verified by the helper on every run that only executes the helper.
- **Manual drive.** Click the toolbar icon on the demo page. The panel opens at half the window width and the article text shifts left instead of hiding under it. Scroll slowly. The highlighted paragraph and the trust card change together.
- **Proof for a manual run.** Save a screenshot of the opened panel next to the article into the evidence directory with the date in the file name, and note the page URL with it.

## Gotchas

- Current branded Chrome ignores `--load-extension` on the command line, and driving an unpacked extension over the debug port is blocked. That is why this feature has no scripted journey. Do not weaken this file to claim preview proof covers it.
- After rebuilding `dist`, the extension must be reloaded from `chrome://extensions` and the article page refreshed. A stale content script shows the old behavior.
- The panel remembers its width and collapsed state per browser profile. A manual run that starts collapsed is not a bug.
