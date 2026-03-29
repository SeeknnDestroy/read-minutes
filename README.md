# Read Minutes

Read Minutes is a Chrome extension that estimates how long a blog post or newsletter will take to read.

## What It Does

- Detects article-like content with `Defuddle`
- Shows a floating top-right `X min read` badge on long-form pages
- Shows page status, reading time, and word count in the popup
- Lets you copy a page's cleaned markdown for LLM use
- Opens a dedicated raw markdown viewer in a new extension tab
- Lets the user change the reading-speed estimate in the popup
- Keeps markdown extraction local by using Defuddle in-page with async/network fallbacks disabled

## Defaults

- Words per minute: `225`
- Minimum article threshold: `180` words
- Inline badge: enabled

## Development

- `npm install`
- `npm run dev`
- `npm run test`
- `npm run typecheck`
- `npm run build`

## Load Unpacked In Chrome

1. Run `npm install`.
2. Run `npm run build`.
3. Open `chrome://extensions`.
4. Turn on **Developer mode**.
5. Choose **Load unpacked**.
6. Select the `dist` folder from this project.

## QA Notes

- `npm run test`, `npm run typecheck`, and `npm run build` all pass.
- Inline badge smoke test passed in Playwright-loaded Chromium against local fixtures on March 25, 2026:
  - `article.html` showed `2 min read`
  - `non-article.html` showed no badge
- Popup state and settings persistence are covered by unit tests in [`test/popup-view-model.test.ts`](/Users/talhasari/Projects/github/reading-time-extension/test/popup-view-model.test.ts) and [`test/settings.test.ts`](/Users/talhasari/Projects/github/reading-time-extension/test/settings.test.ts).
- Local markdown extraction, transcript storage handoff, popup transcript actions, and transcript-view rendering are covered by [`test/transcript.test.ts`](/Users/talhasari/Projects/github/reading-time-extension/test/transcript.test.ts), [`test/transcript-storage.test.ts`](/Users/talhasari/Projects/github/reading-time-extension/test/transcript-storage.test.ts), and [`test/popup-main.test.ts`](/Users/talhasari/Projects/github/reading-time-extension/test/popup-main.test.ts).
