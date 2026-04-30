# Editor Reference Audit

Status: accepted for cleanup on 2026-04-30

Galley Editor is a CodeMirror 6 markdown editor, not a full clone of Joplin's editor package. The local `3rdparty/editor/` reference tree was useful while defining early behavior, but it should not remain in the public repository. This audit records what was learned before removing that source tree.

## Already Implemented In Galley

- CodeMirror 6 markdown editing with Lezer parsing.
- Live-preview markdown decorations for headings, emphasis, inline code, fenced code blocks, blockquotes, links, lists, task checkboxes, dividers, tables, and images.
- Reference-style links, link click interception, built-in image widgets, optional custom image rendering, bidi line attributes, and plugin decoration range APIs.
- Smart list input for Enter, Tab, and Backspace.
- Formatting and editing commands: inline formatting, heading/list toggles, insert link/image/code/table/hr, indentation, duplicate line, line insertion, line swapping, search result collection, heading hash navigation, undo/redo, and select all.
- Consumer extension hooks: CodeMirror extensions, custom Galley plugins, custom commands, custom toolbar icons/slots, footer slots, shell styling, code highlighter injection, image renderer injection, paste handler, and imperative handle APIs.

## Intentionally Out Of Scope

- ProseMirror as a second editor engine. Galley's core product is CodeMirror markdown editing.
- Joplin plugin content-script loading, resource URL resolution, note IDs, external editor integration, and WebView-specific APIs.
- CodeMirror 5 compatibility and CM5 addon emulation.
- Joplin-specific resource download/reload plumbing and internal localization/event protocols.
- A bundled search/replace panel. Galley exposes search result collection and leaves search UI to consumers.
- Full Vim/Emacs keymap modes as built-ins. Consumers can supply CodeMirror keymaps.

## Galley Backlog Worth Reimplementing

These are useful UX ideas, but they should be designed directly for Galley and implemented from specs, not copied from prior source.

- File drop and paste upload hooks. Consumers should receive dropped/pasted `File` objects and return markdown to insert, such as an image link after upload.
- Markdown input completions, including fenced code pair insertion when typing an opening triple backtick at the start of a block.
- Optional markdown extensions and renderer registration for domain features such as KaTeX, Mermaid, callouts, details blocks, admonitions, or custom inline syntax.
- Table editing affordances: visual add-row/add-column controls, column alignment controls, and keyboard-friendly table operations.
- Image editing affordances: resize handles, alt/title editing, and optional consumer-controlled upload/transform workflows.
- Better link and image tooltips or inline popovers that remain markdown-first and accessible.
- Optional math and diagram rendering that is dependency-free by default but lets consumers wire KaTeX, Mermaid, or equivalent libraries.

## Cleanup Decision

Remove `3rdparty/editor/` from the repository. Keep this audit as the record of the reference review and future backlog. Future behavior work must start from a Galley spec and tests, with any external project used only as inspiration through prose notes.
