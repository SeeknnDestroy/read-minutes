# Read Minutes

Read Minutes is a Chrome extension that estimates how long a blog post or newsletter will take to read.

## What It Does

- Detects article-like content with `Defuddle`
- Shows a floating top-right `X min read` badge on long-form pages
- Shows page status, reading time, and word count in the popup
- Lets the user change the reading-speed estimate in the popup

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
