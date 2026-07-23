# Editor Search and Horizontal Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a built-in CodeMirror search panel and make every editor block width-constrained by default, with an explicit editor-wide horizontal scrolling opt-in.

**Architecture:** `EditorController` will own search as a static CodeMirror feature and horizontal layout as a dedicated `Compartment`. The layout compartment will atomically control `EditorView.lineWrapping`, the `.cm-editor` mode class, and the main scroller's horizontal overflow; `galley-base.css` will use those classes to keep rendered code and tables on the same scrolling surface.

**Tech Stack:** React 19, TypeScript 6, CodeMirror 6 (`@codemirror/state`, `@codemirror/view`, `@codemirror/search`), Vitest/jsdom, Storybook 10, Astro Starlight.

## Global Constraints

- `@codemirror/search` peer dependency: `>=6.5.0`.
- `@codemirror/search` development dependency: `^6.7.1`.
- `tailwindcss` and `@tailwindcss/postcss` development dependencies: `^4.3.3`.
- Node.js support remains `>=20`.
- `horizontalScroll` defaults to `false`.
- Constrained root class: `ge-width-constrained`.
- Horizontal root class: `ge-horizontal-scroll`.
- The existing `EditorView` must never be recreated for prop changes.
- `EditorView.lineWrapping` must exist only inside the new layout compartment.
- The layout compartment must exclusively own `.cm-scroller` `overflowX`.
- Galley's product key bindings must precede `searchKeymap` so Galley's `Mod-d` duplicate-line command wins.
- Array-form `keymap` continues to replace all defaults; function-form `keymap` receives all defaults.
- Search remains available in preview/read-only mode; CodeMirror hides replacement controls there.
- `GalleyHandle.openSearch()` returns `false` before controller mount.
- No `searchOpen` prop, custom search panel, `closeSearch()`, or per-block scrolling option.
- `erasableSyntaxOnly` remains enabled: do not introduce TypeScript enums or parameter-property fields.
- Public API changes require API docs, practical guide examples, aligned Storybook coverage, and changelog entries.

---

## File Map

- `package.json`, `package-lock.json`: declare and lock `@codemirror/search`.
- `package.json`, `package-lock.json`: update the Tailwind test toolchain so Node 26 uses `module.registerHooks()` without `DEP0205`.
- `vite.config.ts`: externalize and dedupe `@codemirror/search` in library mode.
- `src/types.ts`: add `GalleyEditorProps.horizontalScroll` and `GalleyHandle.openSearch()`.
- `src/controller.ts`: install search, compose its keymap, expose `openSearch()`, and own the dynamic horizontal-layout compartment.
- `src/controller.test.ts`: cover search commands, keymap precedence, read-only search, layout reconfiguration, and state preservation.
- `src/components/GalleyEditor.tsx`: default and forward `horizontalScroll`, proxy `openSearch()`, and reconfigure without remounting.
- `src/components/GalleyEditor.test.tsx`: cover the pre-mount search proxy and React prop reconfiguration.
- `src/theme.ts`: stop globally forcing `overflowX: 'hidden'`.
- `src/theme.test.ts`: lock down the mode-specific block CSS contract and removal of theme-owned horizontal overflow.
- `src/galley-base.css`: constrain direct CodeMirror content children and gate code/table sizing by layout class.
- `src/components/GalleyEditor.stories.tsx`: add the prop control, search button, and paired constrained/horizontal block examples.
- `docs-site/src/content/docs/reference/api.md`: document the prop and imperative method.
- `docs-site/src/content/docs/guides/commands.md`: show user-owned search activation.
- `docs-site/src/content/docs/guides/plugins-renderers.md`: explain the editor-wide block-width policy.
- `CHANGELOG.md`: record both public additions and the code-block overflow fix.

---

### Task 0: Remove the Baseline Node Deprecation Warning

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**
- Consumes: Tailwind's PostCSS integration loaded by the Vitest/Vite configuration.
- Produces: `tailwindcss@^4.3.3`, `@tailwindcss/postcss@^4.3.3`, and a warning-free Vitest baseline on Node 26.

- [ ] **Step 1: Reproduce the warning with a focused test**

Run:

```bash
NODE_OPTIONS=--trace-deprecation npx vitest run src/commands/navigation/findInDocument.test.ts
```

Expected: the test passes, but stderr contains `[DEP0205]` with a stack frame in `node_modules/@tailwindcss/node/dist/index.js` calling deprecated `module.register()`. This warning is the RED condition.

- [ ] **Step 2: Update the minimal direct dependency pair**

Run:

```bash
npm install --save-dev tailwindcss@^4.3.3 @tailwindcss/postcss@^4.3.3 --legacy-peer-deps
```

Expected `package.json` entries:

```json
{
  "devDependencies": {
    "@tailwindcss/postcss": "^4.3.3",
    "tailwindcss": "^4.3.3"
  }
}
```

`package-lock.json` must resolve `@tailwindcss/node` to `4.3.3`, whose Node 26 path uses `module.registerHooks()`.

- [ ] **Step 3: Verify the focused test is warning-free**

Run:

```bash
NODE_OPTIONS=--trace-deprecation npx vitest run src/commands/navigation/findInDocument.test.ts
```

Expected: 1 test file and 5 tests PASS; output contains neither `DEP0205` nor another deprecation warning.

- [ ] **Step 4: Verify the full baseline is warning-free**

Run:

```bash
npm run test
```

Expected: 31 test files and 440 tests PASS with no Node deprecation warnings.

- [ ] **Step 5: Commit the toolchain update**

```bash
git add package.json package-lock.json
git commit -m "chore(deps): update Tailwind test toolchain"
```

---

### Task 1: Built-in Search and Imperative Search API

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `vite.config.ts`
- Modify: `src/types.ts`
- Modify: `src/controller.ts`
- Test: `src/controller.test.ts`
- Modify: `src/components/GalleyEditor.tsx`
- Test: `src/components/GalleyEditor.test.tsx`

**Interfaces:**
- Consumes: CodeMirror `search()`, `searchKeymap`, and `openSearchPanel(view)`.
- Produces: `GalleyHandle.openSearch(): boolean`; built-in `Mod-f`; `@codemirror/search` as an external peer.

- [ ] **Step 1: Declare and lock the CodeMirror search package**

Update `package.json` so the relevant sections contain:

```json
{
  "peerDependencies": {
    "@codemirror/commands": ">=6.10.0",
    "@codemirror/lang-markdown": ">=6.5.0",
    "@codemirror/language": ">=6.12.0",
    "@codemirror/search": ">=6.5.0",
    "@codemirror/state": ">=6.6.0",
    "@codemirror/view": ">=6.41.0"
  },
  "devDependencies": {
    "@codemirror/search": "^6.7.1"
  }
}
```

Then refresh the lockfile:

```bash
npm install --legacy-peer-deps
```

Expected: exit 0; the root package entry in `package-lock.json` lists the search peer and dev dependency, and `node_modules/@codemirror/search` is locked.

- [ ] **Step 2: Externalize the package in library builds**

Add the package to `codemirrorPackages` in `vite.config.ts`:

```ts
const codemirrorPackages = [
  '@codemirror/state',
  '@codemirror/view',
  '@codemirror/lang-markdown',
  '@codemirror/language',
  '@codemirror/commands',
  '@codemirror/search',
  '@lezer/highlight',
  '@lezer/markdown',
  '@lezer/common',
];
```

- [ ] **Step 3: Write failing controller search tests**

In `src/controller.test.ts`, add these cases to `describe('EditorController key handling', ...)`:

```ts
it('opens the built-in search panel with Mod-f', () => {
  const controller = createController('alpha beta alpha');

  const event = dispatchKey(controller.view, {
    key: 'f',
    code: 'KeyF',
    keyCode: 70,
    which: 70,
    ctrlKey: true,
  });

  expect(event.defaultPrevented).toBe(true);
  expect(controller.view.dom.querySelector('.cm-search')).toBeInstanceOf(HTMLElement);
  expect(
    controller.view.dom.querySelector<HTMLInputElement>('input[name="search"]'),
  ).toBeInstanceOf(HTMLInputElement);
});

it('opens and reuses the built-in search panel through the imperative API', () => {
  const controller = createController('alpha beta alpha');

  expect(controller.openSearch()).toBe(true);
  const panel = controller.view.dom.querySelector('.cm-search');

  expect(panel).toBeInstanceOf(HTMLElement);
  expect(controller.openSearch()).toBe(true);
  expect(controller.view.dom.querySelector('.cm-search')).toBe(panel);
});

it('keeps search available without replacement controls in preview mode', () => {
  const controller = createController('alpha beta alpha', {}, { mode: 'preview' });

  expect(controller.openSearch()).toBe(true);
  expect(
    controller.view.dom.querySelector<HTMLInputElement>('input[name="search"]'),
  ).toBeInstanceOf(HTMLInputElement);
  expect(controller.view.dom.querySelector('input[name="replace"]')).toBeNull();
  expect(controller.view.dom.querySelector('button[name="replace"]')).toBeNull();
  expect(controller.view.dom.querySelector('button[name="replaceAll"]')).toBeNull();
});
```

Extend the existing array-form custom keymap test with:

```ts
const find = dispatchKey(controller.view, {
  key: 'f',
  code: 'KeyF',
  keyCode: 70,
  which: 70,
  ctrlKey: true,
});

expect(find.defaultPrevented).toBe(false);
expect(controller.view.dom.querySelector('.cm-search')).toBeNull();
```

Extend the existing function-form custom keymap test with:

```ts
expect(receivedDefaults).toContain('Mod-f');
```

The existing `uses Mod-D to duplicate the current line by default` test remains the regression proof that Galley's `Mod-d` wins over CodeMirror's select-next-occurrence binding.

- [ ] **Step 4: Run the controller tests and verify RED**

Run:

```bash
npx vitest run src/controller.test.ts
```

Expected: FAIL because `openSearch()` does not exist and `Mod-f` does not open `.cm-search`.

- [ ] **Step 5: Add the public handle signature**

Add this method to `GalleyHandle` in `src/types.ts`, after `blur()`:

```ts
/** Open and focus the built-in CodeMirror search panel. */
openSearch(): boolean;
```

- [ ] **Step 6: Install search in the controller and preserve keymap precedence**

Add the import in `src/controller.ts`:

```ts
import { openSearchPanel, search, searchKeymap } from '@codemirror/search';
```

Add `search()` to `buildStaticExtensions()` after `bracketMatching()`:

```ts
bracketMatching(),
search(),
EditorState.allowMultipleSelections.of(true),
```

Compose `searchKeymap` after Galley's product bindings and before broad defaults:

```ts
const combinedKeymap = [
  ...controllerDefaults,
  ...this.buildCommandKeymap(),
  ...searchKeymap,
  ...standardKeymap,
  ...historyKeymap,
];
```

Add the imperative method beside `focus()` and `blur()`:

```ts
openSearch(): boolean {
  return openSearchPanel(this.view);
}
```

- [ ] **Step 7: Run the controller tests and verify GREEN**

Run:

```bash
npx vitest run src/controller.test.ts
```

Expected: PASS; `Mod-f`, repeated `openSearch()`, preview behavior, custom keymap behavior, and Galley's `Mod-d` all pass.

- [ ] **Step 8: Write the failing React proxy test**

Add this case to `src/components/GalleyEditor.test.tsx` next to the other pre-mount proxy tests:

```tsx
it('returns false when openSearch is called before the controller mounts', () => {
  let observed: boolean | undefined;

  function Parent() {
    const editorRef = useRef<GalleyHandle>(null);
    useLayoutEffect(() => {
      observed = editorRef.current?.openSearch();
    }, []);
    return <GalleyEditor ref={editorRef} value="alpha" theme="light" />;
  }

  mount(<Parent />);

  expect(observed).toBe(false);
});
```

- [ ] **Step 9: Run the React test and verify RED**

Run:

```bash
npx vitest run src/components/GalleyEditor.test.tsx
```

Expected: FAIL because the proxy does not expose `openSearch()`.

- [ ] **Step 10: Proxy `openSearch()` safely**

Add this entry to `handleProxy` in `src/components/GalleyEditor.tsx`, after `blur`:

```ts
openSearch: () => controllerRef.current?.openSearch() ?? false,
```

- [ ] **Step 11: Run focused search tests and verify GREEN**

Run:

```bash
npx vitest run src/controller.test.ts src/components/GalleyEditor.test.tsx
```

Expected: both files PASS with no warnings.

- [ ] **Step 12: Commit the search deliverable**

```bash
git add package.json package-lock.json vite.config.ts src/types.ts src/controller.ts src/controller.test.ts src/components/GalleyEditor.tsx src/components/GalleyEditor.test.tsx
git commit -m "feat(editor): add built-in search"
```

---

### Task 2: Dynamic Editor-Wide Horizontal Layout

**Files:**
- Modify: `src/types.ts`
- Modify: `src/controller.ts`
- Test: `src/controller.test.ts`
- Modify: `src/components/GalleyEditor.tsx`
- Test: `src/components/GalleyEditor.test.tsx`
- Modify: `src/theme.ts`
- Test: `src/theme.test.ts`

**Interfaces:**
- Consumes: `Compartment.reconfigure()`, `EditorView.lineWrapping`, `EditorView.editorAttributes`, and `EditorView.theme`.
- Produces: `GalleyEditorProps.horizontalScroll?: boolean`; required `ControllerSettings.horizontalScroll: boolean`; `.ge-width-constrained` or `.ge-horizontal-scroll` on `.cm-editor`.

- [ ] **Step 1: Write failing controller layout tests**

Add `horizontalScroll: false` to `defaultSettings()` in `src/controller.test.ts`:

```ts
horizontalScroll: false,
```

Add these cases to `describe('EditorController runtime state', ...)`:

```ts
it('uses width-constrained line wrapping by default', () => {
  const controller = createController('a very long line');

  expect(controller.view.dom.classList.contains('ge-width-constrained')).toBe(true);
  expect(controller.view.dom.classList.contains('ge-horizontal-scroll')).toBe(false);
  expect(controller.view.contentDOM.classList.contains('cm-lineWrapping')).toBe(true);
  expect(getComputedStyle(controller.view.scrollDOM).overflowX).toBe('hidden');
});

it('reconfigures horizontal layout without recreating the editor or its state', () => {
  const controller = createController('alpha');
  const originalView = controller.view;
  const runtimeField = StateField.define<number>({
    create: () => 7,
    update: (value) => value,
  });
  const runtimeHandle = controller.addExtension(runtimeField);
  controller.select(2);
  controller.insertText('X');

  controller.updateSettings(defaultSettings({ horizontalScroll: true }));

  expect(controller.view).toBe(originalView);
  expect(controller.getContent()).toBe('alXpha');
  expect(controller.getSelection()).toMatchObject({ anchor: 3, head: 3 });
  expect(controller.view.state.field(runtimeField)).toBe(7);
  expect(controller.view.dom.classList.contains('ge-width-constrained')).toBe(false);
  expect(controller.view.dom.classList.contains('ge-horizontal-scroll')).toBe(true);
  expect(controller.view.contentDOM.classList.contains('cm-lineWrapping')).toBe(false);
  expect(getComputedStyle(controller.view.scrollDOM).overflowX).toBe('auto');

  controller.undo();
  expect(controller.getContent()).toBe('alpha');
  runtimeHandle.remove();
});
```

- [ ] **Step 2: Run the controller test and verify RED**

Run:

```bash
npx vitest run src/controller.test.ts
```

Expected: FAIL because `ControllerSettings.horizontalScroll`, layout classes, and reconfiguration do not exist.

- [ ] **Step 3: Add the public prop and controller setting**

Add to `GalleyEditorProps` in `src/types.ts`, after `layout`:

```ts
/** Disable line wrapping and scroll the main editor viewport horizontally. Default: false. */
horizontalScroll?: boolean;
```

Add to `ControllerSettings` in `src/controller.ts`, after `layout`:

```ts
horizontalScroll: boolean;
```

- [ ] **Step 4: Move wrapping and overflow into a dedicated compartment**

In `EditorController`, add the stable field:

```ts
private readonly horizontalLayoutCompartment = new Compartment();
```

Add this focused helper before `buildStaticExtensions()`:

```ts
private buildHorizontalLayoutExtension(horizontalScroll: boolean): Extension {
  return [
    EditorView.editorAttributes.of({
      class: horizontalScroll ? 'ge-horizontal-scroll' : 'ge-width-constrained',
    }),
    ...(horizontalScroll ? [] : [EditorView.lineWrapping]),
    EditorView.theme({
      '.cm-scroller': {
        overflowX: horizontalScroll ? 'auto' : 'hidden',
      },
    }),
  ];
}
```

Install it in the initial state after the dynamic compartment:

```ts
this.horizontalLayoutCompartment.of(
  this.buildHorizontalLayoutExtension(settings.horizontalScroll),
),
```

Remove this line from `buildStaticExtensions()`:

```ts
EditorView.lineWrapping,
```

In `updateSettings()`, before assigning `this.settings = newSettings`, add:

```ts
if (newSettings.horizontalScroll !== this.settings.horizontalScroll) {
  effects.push(
    this.horizontalLayoutCompartment.reconfigure(
      this.buildHorizontalLayoutExtension(newSettings.horizontalScroll),
    ),
  );
}
```

- [ ] **Step 5: Remove the conflicting theme declaration**

Change the `.cm-scroller` rule in `buildCmTheme()` in `src/theme.ts` to:

```ts
'.cm-scroller': {
  overflowY: 'auto',
},
```

The resulting source must contain no `overflowX` declaration in `buildCmTheme()`.

- [ ] **Step 6: Run the controller test and verify GREEN**

Run:

```bash
npx vitest run src/controller.test.ts
```

Expected: PASS; default wrapping, horizontal switching, view identity, selection, history, and runtime extension state are preserved.

- [ ] **Step 7: Write the failing React prop-reconfiguration test**

Add this case to `src/components/GalleyEditor.test.tsx`:

```tsx
it('reconfigures horizontalScroll without replacing the CodeMirror view', () => {
  const { container, root } = mount(
    <GalleyEditor value="alpha" theme="light" horizontalScroll={false} />,
  );
  const editor = container.querySelector('.cm-editor');

  expect(editor?.classList.contains('ge-width-constrained')).toBe(true);

  rerender(
    root,
    <GalleyEditor value="alpha" theme="light" horizontalScroll />,
  );

  expect(container.querySelector('.cm-editor')).toBe(editor);
  expect(editor?.classList.contains('ge-width-constrained')).toBe(false);
  expect(editor?.classList.contains('ge-horizontal-scroll')).toBe(true);
});
```

- [ ] **Step 8: Run the React test and verify RED**

Run:

```bash
npx vitest run src/components/GalleyEditor.test.tsx
```

Expected: FAIL because the wrapper does not forward `horizontalScroll`.

- [ ] **Step 9: Forward and dynamically sync the prop**

In the `GalleyEditor` prop destructuring, add:

```ts
horizontalScroll = false,
```

Add the setting in `buildSettings()`:

```ts
horizontalScroll,
```

Add `horizontalScroll` to the settings-sync effect dependency list:

```ts
}, [editable, placeholder, ariaLabel, theme, editorClassName, classNames, minRows, maxRows, layout, horizontalScroll, tabIndents, keymap, codeHighlighter, imageRenderer, missingImageRenderer, imageControlsRenderer, tableControlIcons, onLinkClick, bidi, effectiveMode, plugins, disabledPlugins, extensions, uploadInteraction, uploadPlaceholderRenderer, dropIndicatorRenderer, uploadOverlayRenderer]);
```

- [ ] **Step 10: Add a source-level theme ownership test**

In `src/theme.test.ts`, define the adjacent source path:

```ts
const themeSourcePath = resolve(dirname(fileURLToPath(import.meta.url)), 'theme.ts');
```

Add:

```ts
it('leaves horizontal scroller overflow to the layout compartment', () => {
  const source = readFileSync(themeSourcePath, 'utf8');

  expect(source).not.toContain("overflowX: 'hidden'");
  expect(source).not.toContain("overflowX: 'auto'");
});
```

- [ ] **Step 11: Run focused layout tests**

Run:

```bash
npx vitest run src/controller.test.ts src/components/GalleyEditor.test.tsx src/theme.test.ts
```

Expected: all three files PASS.

- [ ] **Step 12: Commit the layout API**

```bash
git add src/types.ts src/controller.ts src/controller.test.ts src/components/GalleyEditor.tsx src/components/GalleyEditor.test.tsx src/theme.ts src/theme.test.ts
git commit -m "feat(editor): add horizontal scroll mode"
```

---

### Task 3: Constrain Rendered Blocks and Delegate Horizontal Scrolling

**Files:**
- Test: `src/theme.test.ts`
- Modify: `src/galley-base.css`

**Interfaces:**
- Consumes: `.ge-width-constrained` and `.ge-horizontal-scroll` from Task 2.
- Produces: one main horizontal scrolling surface; wrapped code/table blocks by default; natural-width code/table blocks in horizontal mode.

- [ ] **Step 1: Write failing CSS contract tests**

Add these cases to `describe('galley-base.css theme contract', ...)` in `src/theme.test.ts`:

```ts
it('lets constrained CodeMirror children and rendered blocks shrink', () => {
  const css = readCss();
  const childBlock = getBlock(
    css,
    /^\.ge-width-constrained \.cm-content > \*\s*\{(?<body>[\s\S]*?)\}/m,
  );
  const codeBlock = getBlock(css, /^\.ge-code-block\s*\{(?<body>[\s\S]*?)\}/m);

  expect(childBlock).toContain('box-sizing: border-box;');
  expect(childBlock).toContain('max-width: 100%;');
  expect(childBlock).toContain('min-width: 0;');
  expect(codeBlock).toContain('box-sizing: border-box;');
  expect(codeBlock).toContain('max-width: 100%;');
  expect(codeBlock).toContain('min-width: 0;');
  expect(codeBlock).toContain('width: 100%;');
});

it('wraps code blocks in constrained mode without a nested scrollbar', () => {
  const css = readCss();
  const bodyBlock = getBlock(
    css,
    /^\.ge-width-constrained \.ge-code-body\s*\{(?<body>[\s\S]*?)\}/m,
  );
  const codeBlock = getBlock(
    css,
    /^\.ge-width-constrained \.ge-code-body code\s*\{(?<body>[\s\S]*?)\}/m,
  );

  expect(bodyBlock).toContain('overflow-x: clip;');
  expect(codeBlock).toContain('overflow-wrap: anywhere;');
  expect(codeBlock).toContain('white-space: pre-wrap;');
});

it('lets code blocks widen the main scroller in horizontal mode', () => {
  const css = readCss();
  const wrapperBlock = getBlock(
    css,
    /^\.ge-horizontal-scroll \.ge-code-block\s*\{(?<body>[\s\S]*?)\}/m,
  );
  const bodyBlock = getBlock(
    css,
    /^\.ge-horizontal-scroll \.ge-code-body\s*\{(?<body>[\s\S]*?)\}/m,
  );
  const codeBlock = getBlock(
    css,
    /^\.ge-horizontal-scroll \.ge-code-body code\s*\{(?<body>[\s\S]*?)\}/m,
  );

  expect(wrapperBlock).toContain('max-width: none;');
  expect(wrapperBlock).toContain('overflow: visible;');
  expect(wrapperBlock).toContain('width: max-content;');
  expect(bodyBlock).toContain('overflow-x: visible;');
  expect(codeBlock).toContain('overflow-wrap: normal;');
  expect(codeBlock).toContain('white-space: pre;');
});

it('gates table sizing and overflow by editor layout mode', () => {
  const css = readCss();
  const constrainedScroll = getBlock(
    css,
    /^\.ge-width-constrained \.ge-table-scroll\s*\{(?<body>[\s\S]*?)\}/m,
  );
  const horizontalWidget = getBlock(
    css,
    /^\.ge-horizontal-scroll \.ge-table-widget\s*\{(?<body>[\s\S]*?)\}/m,
  );
  const horizontalScroll = getBlock(
    css,
    /^\.ge-horizontal-scroll \.ge-table-scroll\s*\{(?<body>[\s\S]*?)\}/m,
  );
  const horizontalTable = getBlock(
    css,
    /^\.ge-horizontal-scroll \.ge-table-rendered\s*\{(?<body>[\s\S]*?)\}/m,
  );

  expect(constrainedScroll).toContain('overflow-x: clip;');
  expect(horizontalWidget).toContain('max-width: none;');
  expect(horizontalWidget).toContain('width: max-content;');
  expect(horizontalScroll).toContain('max-width: none;');
  expect(horizontalScroll).toContain('overflow-x: visible;');
  expect(horizontalTable).toContain('table-layout: auto;');
  expect(horizontalTable).toContain('width: max-content;');
});
```

- [ ] **Step 2: Run the CSS contract test and verify RED**

Run:

```bash
npx vitest run src/theme.test.ts
```

Expected: FAIL because the mode-qualified code/table selectors do not exist and `.ge-code-body`/`.ge-table-scroll` still own nested horizontal scrolling.

- [ ] **Step 3: Add generic constrained child sizing**

Add after the `.ge-editor-shell .cm-content` rule in `src/galley-base.css`:

```css
.ge-width-constrained .cm-content > * {
  box-sizing: border-box;
  max-width: 100%;
  min-width: 0;
}
```

This targets CodeMirror line and block-decoration children without assuming a built-in plugin class, so custom block widgets receive the same host constraint.

- [ ] **Step 4: Replace code-block overflow rules**

Extend the base `.ge-code-block` rule:

```css
.ge-code-block {
  background: var(--ge-color-code-fence-bg);
  border: 1px solid var(--ge-color-border);
  border-radius: var(--ge-radius-block);
  box-sizing: border-box;
  color: var(--ge-color-code-fg);
  font-family: var(--ge-font-mono);
  font-size: var(--ge-code-font-size);
  margin: 0.65em 0;
  max-width: 100%;
  min-width: 0;
  overflow: hidden;
  width: 100%;
}
```

Keep `.ge-code-body` structural only:

```css
.ge-code-body {
  margin: 0;
  padding: 12px;
}
```

Replace the unconditional code `white-space` rule with:

```css
.ge-width-constrained .ge-code-body {
  overflow-x: clip;
}

.ge-width-constrained .ge-code-body code {
  overflow-wrap: anywhere;
  white-space: pre-wrap;
  word-break: normal;
}

.ge-horizontal-scroll .ge-code-block {
  max-width: none;
  min-width: 100%;
  overflow: visible;
  width: max-content;
}

.ge-horizontal-scroll .ge-code-body {
  overflow-x: visible;
}

.ge-horizontal-scroll .ge-code-body code {
  overflow-wrap: normal;
  white-space: pre;
}
```

- [ ] **Step 5: Gate table overflow and natural width by mode**

Remove `overflow-x: auto` from the base `.ge-table-scroll` rule. Add:

```css
.ge-width-constrained .ge-table-scroll {
  overflow-x: clip;
}

.ge-horizontal-scroll .ge-table-widget {
  max-width: none;
  width: max-content;
}

.ge-horizontal-scroll .ge-table-scroll {
  max-width: none;
  overflow-x: visible;
  width: max-content;
}

.ge-horizontal-scroll .ge-table-rendered {
  table-layout: auto;
  width: max-content;
}
```

Keep the base `.ge-table-rendered` declarations as the constrained defaults:

```css
.ge-table-rendered {
  background: var(--ge-color-surface-elevated);
  border-collapse: collapse;
  min-width: 100%;
  table-layout: fixed;
  width: 100%;
}
```

Do not change the existing image `max-width: 100%` rules.

- [ ] **Step 6: Run CSS and plugin regression tests**

Run:

```bash
npx vitest run src/theme.test.ts src/plugins/code-fence.test.ts src/plugins/tables.test.ts src/plugins/images.test.ts
```

Expected: all four files PASS; widget DOM behavior remains unchanged while the CSS contract changes.

- [ ] **Step 7: Commit the rendered-block fix**

```bash
git add src/theme.test.ts src/galley-base.css
git commit -m "fix(editor): constrain rendered block widths"
```

---

### Task 4: Public Documentation, Storybook, and Release Notes

**Files:**
- Modify: `src/components/GalleyEditor.stories.tsx`
- Modify: `docs-site/src/content/docs/reference/api.md`
- Modify: `docs-site/src/content/docs/guides/commands.md`
- Modify: `docs-site/src/content/docs/guides/plugins-renderers.md`
- Modify: `CHANGELOG.md`

**Interfaces:**
- Consumes: `horizontalScroll?: boolean` and `GalleyHandle.openSearch(): boolean`.
- Produces: practical consumer examples and paired visual regression stories matching the documented contract.

- [ ] **Step 1: Expose the prop and search method in Storybook**

Add the control to `meta.argTypes` in `src/components/GalleyEditor.stories.tsx`:

```ts
horizontalScroll: { control: 'boolean' },
```

Add this button to `ImperativeHandleStory`, after the `blur()` button:

```tsx
<button onClick={() => ref.current?.openSearch()}>
  openSearch()
</button>
```

Update the story doc comment so the method list includes `openSearch()`.

- [ ] **Step 2: Replace the table-only constrained story with paired block-layout stories**

Define a shared fixture:

```ts
const blockWidthMarkdown = [
  '## Block width policy',
  '',
  'ThisUnbrokenSourceLineDemonstratesTheEditorViewportPolicyBeforeAnyRenderedBlockWidgetAppearsInTheDocument',
  '',
  'Move the cursor through this introduction to compare source wrapping with rendered block sizing.',
  '',
  '```ts',
  'const extremelyLongIdentifier = "SupercalifragilisticexpialidociousSupercalifragilisticexpialidocious";',
  '```',
  '',
  '| Column | Description | Status |',
  '| :--- | :--- | :---: |',
  '| Alpha | SupercalifragilisticexpialidociousSupercalifragilisticexpialidocious | Ready |',
  '| Beta | A long sentence with normal spaces demonstrates the table policy. | Draft |',
].join('\n');
```

Replace `ConstrainedTableEditingStory` with:

```tsx
function BlockWidthStory({ horizontalScroll }: { horizontalScroll: boolean }) {
  const [value, setValue] = useState(blockWidthMarkdown);

  return (
    <div
      data-testid={horizontalScroll ? 'horizontal-block-layout' : 'constrained-block-layout'}
      style={{
        border: '1px solid #cbd5e1',
        borderRadius: '10px',
        margin: '0 auto',
        maxWidth: '360px',
        overflow: 'hidden',
      }}
    >
      <GalleyEditor
        value={value}
        onChange={setValue}
        horizontalScroll={horizontalScroll}
        minRows={12}
        toolbar={false}
        footer={false}
      />
    </div>
  );
}
```

Export both stories:

```tsx
/**
 * Long code and table content wrap inside the editor viewport by default.
 */
export const ConstrainedBlockLayout: Story = {
  render: () => <BlockWidthStory horizontalScroll={false} />,
};

/**
 * `horizontalScroll` disables wrapping and delegates horizontal navigation to
 * the main editor scroller for source lines and rendered blocks.
 */
export const HorizontalBlockLayout: Story = {
  render: () => <BlockWidthStory horizontalScroll />,
};
```

Remove the obsolete `ConstrainedTableEditing` export.

- [ ] **Step 3: Document the API reference**

Add this row to the core props table in `docs-site/src/content/docs/reference/api.md`:

```md
| `horizontalScroll` | `boolean` | `false` |
```

Add this row to the imperative handle table:

```md
| `openSearch()` | Open and focus the built-in CodeMirror search panel. Returns `false` before mount. |
```

- [ ] **Step 4: Add a practical search guide**

Insert this section before `## Built-In Commands` in `docs-site/src/content/docs/guides/commands.md`:

````md
## Built-In Search Panel

Galley includes CodeMirror's search panel. Press `Ctrl+F` on Windows/Linux or
`Cmd+F` on macOS while the editor is focused. Search also works in preview and
read-only editors; replacement controls are omitted in those modes.

Open the same panel from an application toolbar through `GalleyHandle`:

```tsx
import { useRef } from 'react';
import { GalleyEditor, type GalleyHandle } from '@inkyquill/galley-editor';

export function SearchableEditor() {
  const editor = useRef<GalleyHandle>(null);

  return (
    <>
      <button type="button" onClick={() => editor.current?.openSearch()}>
        Find in document
      </button>
      <GalleyEditor ref={editor} />
    </>
  );
}
```

The existing `findInDocument()` helper remains useful when an application needs
matching ranges as data instead of the built-in interactive panel.
````

- [ ] **Step 5: Document the editor-wide width policy**

Add this section before `## Table Editor Block Controls` in `docs-site/src/content/docs/guides/plugins-renderers.md`:

````md
## Block Width and Horizontal Scrolling

Galley wraps source lines and rendered block content to the editor viewport by
default. Fenced code and table cells therefore stay inside narrow host
surfaces, including long unbroken tokens.

Enable one horizontal scrolling surface for the entire editor when unwrapped
source is more important:

```tsx
<GalleyEditor
  value={markdown}
  onChange={setMarkdown}
  horizontalScroll
/>
```

With `horizontalScroll`, the main editor viewport scrolls horizontally.
Rendered code and tables do not create nested horizontal scrollbars. Images
keep their responsive `max-width: 100%` behavior.

See Storybook's **Constrained Block Layout** and **Horizontal Block Layout**
stories for the two modes.
````

Update the existing table paragraph to remove the obsolete
`Constrained Table Editing` story reference:

```md
Rendered tables follow the editor-wide block width policy described above.
They wrap within the viewport by default and participate in the main editor
scrolling surface when `horizontalScroll` is enabled.
```

- [ ] **Step 6: Add unreleased notes**

At the top `## Unreleased` section in `CHANGELOG.md`, add:

```md
### Features

* add the built-in CodeMirror search panel with `Mod-f` and `GalleyHandle.openSearch()`
* add opt-in editor-wide horizontal scrolling with `horizontalScroll`

### Bug Fixes

* constrain fenced code and rendered blocks to the editor viewport by default
* delegate code and table overflow to the main editor scroller in horizontal mode
```

Preserve the existing unreleased table-control entries under `### Bug Fixes`.

- [ ] **Step 7: Build the documentation surfaces**

Run:

```bash
npm run docs:build
npm run build-storybook
```

Expected: both commands exit 0; Starlight renders the new sections and Storybook builds both block-layout stories.

- [ ] **Step 8: Commit docs and stories**

```bash
git add src/components/GalleyEditor.stories.tsx docs-site/src/content/docs/reference/api.md docs-site/src/content/docs/guides/commands.md docs-site/src/content/docs/guides/plugins-renderers.md CHANGELOG.md
git commit -m "docs: document search and horizontal layout"
```

---

### Task 5: Full Verification Gate

**Files:**
- Verify only: all files changed in Tasks 1–4.

**Interfaces:**
- Consumes: complete implementation and documentation.
- Produces: fresh evidence that tests, lint, package builds, docs, and Storybook all succeed.

- [ ] **Step 1: Run the complete automated test suite**

```bash
npm run test
```

Expected: exit 0 with zero failed Vitest tests.

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

Expected: exit 0 with zero ESLint errors.

- [ ] **Step 3: Build the demo and library**

```bash
npm run build
npm run build:lib
```

Expected: both commands exit 0; TypeScript succeeds and the library output leaves `@codemirror/search` external.

- [ ] **Step 4: Rebuild docs and Storybook from the final source**

```bash
npm run docs:build
npm run build-storybook
```

Expected: both commands exit 0.

- [ ] **Step 5: Check the final diff and repository state**

```bash
git diff --check
git status --short
git log -6 --oneline
```

Expected: `git diff --check` prints nothing; the worktree is clean; the five implementation commits are visible with Conventional Commit subjects.

- [ ] **Step 6: Review the requirements one final time**

Confirm from fresh test/build evidence:

- the full test run emits no Node deprecation warnings;
- default code/table content wraps inside the editor viewport;
- `horizontalScroll` switches the existing view to one main horizontal scroller;
- `Mod-f` and `openSearch()` open the same panel;
- preview/read-only search has no replacement controls;
- Galley's `Mod-d` behavior is unchanged;
- public docs, Storybook, and changelog match the implemented API.

No additional commit is required when this verification task produces no file changes.
