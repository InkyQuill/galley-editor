# Toolbar Keybind Tooltips Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show effective Galley Editor command key bindings in built-in toolbar button title tooltips while preserving label-only accessible names.

**Architecture:** Pure command-keymap helpers resolve the consumer's replacement/extension semantics, retain `BuiltinCommand` metadata, and format CodeMirror key strings for macOS or non-macOS display. `GalleyEditor` uses those helpers only for built-in toolbar titles; controller execution semantics remain unchanged and unbound buttons keep their existing title.

**Tech Stack:** React 19, TypeScript 6, CodeMirror 6, Vitest 4, Vite library mode, Astro/Starlight docs.

## Global Constraints

- Tooltips use the effective Galley command keymap, including array replacement and function-form transformation.
- Format `Mod-b` as `⌘B` on macOS and `Ctrl+B` elsewhere.
- Format `Mod-Shift-z` as `⇧⌘Z` on macOS and `Ctrl+Shift+Z` elsewhere.
- Keep `aria-label` label-only.
- Keep unbound command titles unchanged.
- Do not add a search toolbar button, visual shortcut badge, select tooltip, or mode-toggle shortcut.
- Do not add Galley Pad-specific code to this package.
- Preserve the repository's existing untracked `.agents/`, `.x-skills.local.yaml`, and `skills-lock.json`.

---

## File Map

- `src/commands/keymapDisplay.ts`, `src/commands/keymapDisplay.test.ts`: resolve command bindings and format display strings.
- `src/commands/index.ts`: export the pure helpers beside `DEFAULT_KEYMAP`.
- `src/components/GalleyEditor.tsx`, `src/components/GalleyEditor.test.tsx`: apply effective shortcut titles without changing accessible names.
- `src/components/index.ts`: export the reusable formatter/lookup helpers.
- `docs-site/src/content/docs/guides/commands.md`, `docs-site/src/content/docs/guides/customization.md`: document tooltip behavior and custom keymap effects.
- `CHANGELOG.md`: record the additive toolbar behavior.

---

### Task 1: Add pure effective-keymap and display helpers

**Files:**
- Create: `src/commands/keymapDisplay.ts`
- Create: `src/commands/keymapDisplay.test.ts`
- Modify: `src/commands/index.ts`

**Interfaces:**
- Consumes: `BuiltinCommand`, `GalleyKeyBinding`, `DEFAULT_KEYMAP`, and `GalleyEditorProps["keymap"]`.
- Produces: `resolveDisplayKeymap(defaults, customKeymap): GalleyKeyBinding[]`.
- Produces: `findCommandKey(bindings, command): string | undefined`.
- Produces: `formatKeybinding(key, platform): string`.

- [ ] **Step 1: Write RED formatter tests**

Create `src/commands/keymapDisplay.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  findCommandKey,
  formatKeybinding,
  resolveDisplayKeymap,
} from "./keymapDisplay";
import { DEFAULT_KEYMAP } from "./index";

describe("keymap display", () => {
  it.each([
    ["Mod-b", "mac", "⌘B"],
    ["Mod-b", "other", "Ctrl+B"],
    ["Mod-Shift-z", "mac", "⇧⌘Z"],
    ["Mod-Shift-z", "other", "Ctrl+Shift+Z"],
    ["Alt-ArrowUp", "mac", "⌥↑"],
    ["Alt-ArrowUp", "other", "Alt+↑"],
  ] as const)("formats %s for %s", (key, platform, expected) => {
    expect(formatKeybinding(key, platform)).toBe(expected);
  });

  it("finds the key carrying command metadata", () => {
    expect(findCommandKey(DEFAULT_KEYMAP, "toggleBold")).toBe("Mod-b");
    expect(findCommandKey(DEFAULT_KEYMAP, "insertTable")).toBeUndefined();
  });

  it("honors array-form replacement", () => {
    expect(resolveDisplayKeymap(DEFAULT_KEYMAP, [])).toEqual([]);
  });

  it("honors function-form transformation", () => {
    const resolved = resolveDisplayKeymap(
      DEFAULT_KEYMAP,
      (defaults) =>
        defaults.filter(
          (binding) =>
            !("command" in binding) || binding.command !== "toggleBold",
        ),
    );
    expect(findCommandKey(resolved, "toggleBold")).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

```bash
npx vitest run src/commands/keymapDisplay.test.ts
```

Expected: FAIL because `keymapDisplay.ts` does not exist.

- [ ] **Step 3: Implement the helpers**

Create:

```ts
import type { KeyBinding } from "@codemirror/view";
import type { BuiltinCommand, GalleyEditorProps } from "../types";
import type { GalleyKeyBinding } from "./index";

export type ShortcutPlatform = "mac" | "other";

export function resolveDisplayKeymap(
  defaults: readonly GalleyKeyBinding[],
  customKeymap: GalleyEditorProps["keymap"],
): GalleyKeyBinding[] {
  if (typeof customKeymap === "function") {
    return customKeymap([...defaults]) as GalleyKeyBinding[];
  }
  return (customKeymap ?? defaults) as GalleyKeyBinding[];
}

export function findCommandKey(
  bindings: readonly KeyBinding[],
  command: BuiltinCommand,
): string | undefined {
  return bindings.find(
    (binding) =>
      "command" in binding &&
      (binding as GalleyKeyBinding).command === command,
  )?.key;
}

export function formatKeybinding(
  key: string,
  platform: ShortcutPlatform,
): string {
  const parts = key.split("-");
  const keyName = parts.pop() ?? "";
  const modifiers = parts;
  const displayKey = keyName
    .replace(/^ArrowUp$/, "↑")
    .replace(/^ArrowDown$/, "↓")
    .replace(/^ArrowLeft$/, "←")
    .replace(/^ArrowRight$/, "→")
    .replace(/^([a-z])$/, (_, letter: string) => letter.toUpperCase());

  if (platform === "mac") {
    const symbols = [
      modifiers.includes("Shift") ? "⇧" : "",
      modifiers.includes("Ctrl") ? "⌃" : "",
      modifiers.includes("Alt") ? "⌥" : "",
      modifiers.includes("Mod") ? "⌘" : "",
    ].join("");
    return `${symbols}${displayKey}`;
  }

  const labels = [
    modifiers.includes("Mod") || modifiers.includes("Ctrl") ? "Ctrl" : "",
    modifiers.includes("Alt") ? "Alt" : "",
    modifiers.includes("Shift") ? "Shift" : "",
  ].filter(Boolean);
  return [...labels, displayKey].join("+");
}
```

`keymapDisplay.ts` does not import `DEFAULT_KEYMAP`; callers provide the
defaults explicitly. This avoids a cycle with `src/commands/index.ts` and
keeps the binding table single-sourced.

- [ ] **Step 4: Verify GREEN**

```bash
npx vitest run src/commands/keymapDisplay.test.ts
```

Expected: all table, lookup, replacement, and transform tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/commands/keymapDisplay.ts src/commands/keymapDisplay.test.ts src/commands/index.ts
git commit -m "feat(commands): format keybindings for display"
```

---

### Task 2: Apply shortcuts to built-in toolbar titles

**Files:**
- Modify: `src/components/GalleyEditor.test.tsx`
- Modify: `src/components/GalleyEditor.tsx`

**Interfaces:**
- Consumes: `resolveDisplayKeymap`, `findCommandKey`, `formatKeybinding`.
- Produces: bound title form `"{label} ({shortcut})"` and unchanged `aria-label`.

- [ ] **Step 1: Write RED component tests**

Extend the default toolbar test:

```tsx
it("shows bound shortcuts in titles without changing accessible labels", () => {
  const { container } = mount(
    <GalleyEditor value="Hello" theme="light" />,
  );
  const bold = container.querySelector(
    '[aria-label="Bold"]',
  ) as HTMLButtonElement;
  const table = container.querySelector(
    '[aria-label="Insert table"]',
  ) as HTMLButtonElement;

  expect(bold.getAttribute("aria-label")).toBe("Bold");
  expect(bold.getAttribute("title")).toMatch(
    /^(Bold \(⌘B\)|Bold \(Ctrl\+B\))$/,
  );
  expect(table.getAttribute("aria-label")).toBe("Insert table");
  expect(table.getAttribute("title")).toBe("Insert table");
});
```

Add effective-keymap cases:

```tsx
it("removes a tooltip shortcut when array keymap replaces defaults", () => {
  const { container } = mount(
    <GalleyEditor value="Hello" theme="light" keymap={[]} />,
  );
  expect(
    container.querySelector('[aria-label="Bold"]')?.getAttribute("title"),
  ).toBe("Bold");
});

it("uses command metadata returned by a function keymap", () => {
  const bold = DEFAULT_KEYMAP.find(
    (binding) => binding.command === "toggleBold",
  )!;
  const { container } = mount(
    <GalleyEditor
      value="Hello"
      theme="light"
      keymap={(defaults) => [
        ...defaults.filter(
          (binding) =>
            !("command" in binding) ||
            binding.command !== "toggleBold",
        ),
        { ...bold, key: "Alt-b" },
      ]}
    />,
  );
  expect(
    container.querySelector('[aria-label="Bold"]')?.getAttribute("title"),
  ).toMatch(/^(Bold \(⌥B\)|Bold \(Alt\+B\))$/);
});
```

- [ ] **Step 2: Run the component test and verify RED**

```bash
npx vitest run src/components/GalleyEditor.test.tsx
```

Expected: FAIL because toolbar titles are still plain labels.

- [ ] **Step 3: Compute display bindings once per keymap identity**

`useMemo` is already imported. Add:

```tsx
import { DEFAULT_KEYMAP } from "../commands";
import {
  findCommandKey,
  formatKeybinding,
  resolveDisplayKeymap,
} from "../commands/keymapDisplay";
```

Add `type BuiltinCommand` to the existing import from `../types`, then add:

```tsx
const displayKeymap = useMemo(
  () => resolveDisplayKeymap(DEFAULT_KEYMAP, keymap),
  [keymap],
);
const shortcutPlatform =
  typeof navigator !== "undefined" &&
  /Mac|iPhone|iPad|iPod/.test(navigator.platform)
    ? "mac"
    : "other";
```

The keymap callback is required to be a pure transform, matching its existing controller contract. Memoization prevents repeat evaluation unless its identity changes.

- [ ] **Step 4: Build the title in toolbarButton**

Change the command type and title:

```tsx
const toolbarButton = (
  name: ToolbarIconName,
  label: string,
  ariaLabel: string,
  command: BuiltinCommand,
  ...args: unknown[]
) => {
  const key = findCommandKey(displayKeymap, command);
  const title = key
    ? `${ariaLabel} (${formatKeybinding(key, shortcutPlatform)})`
    : ariaLabel;

  return (
    <button
      type="button"
      className="ge-toolbar-button"
      aria-label={ariaLabel}
      title={title}
      disabled={!canEditDocument}
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => runCommand(command, ...args)}
    >
      {renderIcon(name, label, ariaLabel)}
    </button>
  );
};
```

Do not change the Text style select or mode toggle.

- [ ] **Step 5: Verify GREEN and regression suites**

```bash
npx vitest run src/commands/keymapDisplay.test.ts src/components/GalleyEditor.test.tsx src/controller.test.ts
```

Expected: all focused tests PASS and controller custom-keymap behavior remains unchanged.

- [ ] **Step 6: Commit**

```bash
git add src/components/GalleyEditor.tsx src/components/GalleyEditor.test.tsx
git commit -m "feat(toolbar): show command shortcuts in tooltips"
```

---

### Task 3: Export and document the reusable behavior

**Files:**
- Modify: `src/components/index.ts`
- Modify: `docs-site/src/content/docs/guides/commands.md`
- Modify: `docs-site/src/content/docs/guides/customization.md`
- Modify: `CHANGELOG.md`

**Interfaces:**
- Produces public named exports: `formatKeybinding`, `findCommandKey`, and `ShortcutPlatform`.
- Documents that custom keymaps control both execution and visible built-in-toolbar hints.

- [ ] **Step 1: Export the pure helpers**

Add beside the existing command exports:

```ts
export {
  findCommandKey,
  formatKeybinding,
  type ShortcutPlatform,
} from "../commands/keymapDisplay";
```

Keep `resolveDisplayKeymap` internal because it accepts the component prop contract and is not needed by consumers.

- [ ] **Step 2: Document command tooltip behavior**

In the commands guide, after the `DEFAULT_KEYMAP` section, add:

```md
### Built-in toolbar shortcut hints

Buttons in Galley's built-in toolbar append their effective command shortcut
to the hover title, such as `Bold (⌘B)` on macOS or `Bold (Ctrl+B)` elsewhere.
The accessible name remains `Bold`.

Array-form keymaps replace the defaults, so removed commands lose their
shortcut hint. Function-form keymaps can preserve, remove, or remap command
metadata. Keep the `command` field when cloning a `DEFAULT_KEYMAP` binding if
the built-in toolbar should display the remapped key.
```

In the customization guide's toolbar icon section, state that replacing icon content does not replace the label or effective shortcut title.

- [ ] **Step 3: Update the changelog**

Under `Unreleased > Added`, record:

```md
- Built-in toolbar title tooltips now show effective command shortcuts while
  keeping label-only accessible names.
- `formatKeybinding()` and `findCommandKey()` helpers for reusable shortcut
  presentation.
```

- [ ] **Step 4: Verify package and docs**

```bash
npm test
npm run lint
npm run build:lib
npm run build
npm run docs:build
npm run build-storybook
```

Expected: all commands exit 0; generated declarations export the two helpers; no new lint warnings.

- [ ] **Step 5: Commit**

```bash
git add src/components/index.ts docs-site/src/content/docs/guides/commands.md docs-site/src/content/docs/guides/customization.md CHANGELOG.md
git commit -m "docs: explain toolbar shortcut tooltips"
```

---

### Task 4: Final companion verification

**Files:**
- Verify only.

- [ ] **Step 1: Run the complete package checks**

```bash
npm test
npm run test:commit-msg
npm run lint
npm run build:lib
npm run build
npm run docs:build
npm run build-storybook
```

Expected: every command exits 0.

- [ ] **Step 2: Inspect final scope**

```bash
git status --short
git log --oneline -4
git diff HEAD^ --check
```

Expected: only planned files plus the three pre-existing untracked agent configuration paths are present.

- [ ] **Step 3: Release handoff**

The tooltip change is independently releasable and does not block Galley Pad's 0.11.0 search/Word Wrap work. After it is merged and semantic-release publishes the next package version, update Galley Pad in a separate dependency-only change if immediate tooltip adoption is desired.
