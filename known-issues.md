# Interaction audit — 2026-09-10

## Native Galley Pad trailing-space deletion (open)

- Observed: the user reports `тест тест т` → Backspace → `t` becoming `тест тестt` in the installed native Galley Pad on CachyOS.
- Expected: `тест тест t`; deleting the final character must preserve the preceding space.
- Environment: installed `galley-pad-bin 1.6.0-1`, WebKitGTK `2.52.6-1`. The v1.6.0 application uses Galley Editor `0.13.0`. The primary local Galley Pad checkout is older (`1.2.3`, editor `0.10.2`), so it is not an exact release reproduction.
- Checked: source demo in Chromium, Firefox and Playwright WebKit; local Galley Pad frontend in Chromium/WebKit; a separate system-WebKitGTK window against the source demo and older local Galley Pad frontend; published editor 0.13.0 in the Codex embedded browser. These checks preserved the space. The user also confirmed the source bench does not reproduce the problem.
- Impact: native document editing can lose meaningful whitespace, according to the user's reproduction. This issue is **not marked fixed**.
- Next action: capture DOM input/selection and CodeMirror transaction logs in the actual native 1.6.0 application, including active wrapping settings and whether text is typed or pasted. The interaction bench now supplies console tracing and exact whitespace diagnostics. Do not infer a native fix from browser-only success.

## Fixed in the current working tree

- Checkbox disappearance: list and task plugins emitted overlapping replacement widgets. Ordinary bullet decorations now skip task items; checkbox events are isolated from editor selection handling.
- Read-only/preview task edits: checkbox widgets now disable interaction and reject input-driven changes.
- Unicode Backspace: deletion used UTF-16 code units and could leave half an emoji. It now uses grapheme boundaries.
- Empty-list Enter: the Markdown language's higher-priority default bindings bypassed Galley's list behavior and callbacks. The controller now disables that redundant keymap.

See `docs-site/src/content/docs/guides/interaction-testing.md` and `e2e/interactions.spec.ts` for the reproducible bench and browser checks. Native IME, mobile/touch, and operating-system file/clipboard integrations are not exhaustively audited by this suite.
