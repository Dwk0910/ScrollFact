# Google login guard

Google login opens the Google sign-in window inside the extension and shows the returned authorization code. Plain HTTP preview cannot open that window, so the button answers with a guard message instead.

## Sub-features

- `login-guard-preview` shows the extension-only message in preview mode.
- `login-window-extension` opens the Google window and prints the code. This runs only inside the loaded extension.
- `login-redirect-url` shows the redirect URL to register in Google Cloud. This shows only inside the extension.

## How to get to it (user POV)

- Press `Google로 로그인` under the analyze button in the panel header.

## Driving it with drive.mjs

Preconditions:

- The doctor command passes every line.
- The panel page is served in preview mode, not inside Chrome as an extension.

- **Press login in preview.** Run `node .cursor/skills/verify-scrollfact/helpers/drive.mjs login-guard`. The first assertion passes when the page shows `확장 프로그램에서만 로그인할 수 있습니다.`
- **Check the redirect box stays hidden.** The second assertion in the same journey passes when the page text has no `chromiumapp.org` address.
- **Proof.** Open the newest `login-guard-*.json`. Both assertions pass and the screenshot shows the guard message under the header.

## Gotchas

- A passing preview run never proves the Google window opens. That path needs the unpacked extension loaded from `frontend/dist` and a client ID in `.env`.
- The client ID is inlined at build time. Changing `.env` without `npm run build` leaves the old ID in `dist`.
- The authorization code is single-use and short lived. Never paste a real code into evidence files.
