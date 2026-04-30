# Toolbar Surface Modes Design

## Goal

Extend the v0.4 editor polish with consumer-facing configuration for toolbar icons, editor surface styling, and rendering modes.

## Scope

### Toolbar Icons

The built-in toolbar remains dependency-free by default, but consumers can override individual button icons:

```ts
toolbar?: boolean | {
  enabled?: boolean;
  showModeToggle?: boolean;
  icons?: Partial<Record<ToolbarIconName, ReactNode | ToolbarIconRenderer>>;
}
```

Consumers can pass inline SVG elements, components from icon packs such as Lucide, or a render function that receives the icon name, accessible label, and current editor mode.

### Surface Styling

Consumers can customize the editor shell without replacing the base stylesheet:

```ts
surface?: {
  className?: string;
  style?: React.CSSProperties;
  contentPadding?: string;
  toolbarPadding?: string;
  footerPadding?: string;
}
```

`surface.style` is applied to `.ge-editor-shell`, so gradients, `backdropFilter`, frosted glass, and custom shadows can be set directly. Padding helpers set CSS variables on the shell:

- `--ge-content-padding`
- `--ge-toolbar-padding`
- `--ge-footer-padding`

The base stylesheet defines those variables, plus `--ge-backdrop-filter`, as part of the canonical theme contract.

### Rendering Modes

The editor supports three modes:

- `live`: current half-WYSIWYG behavior. Markdown syntax reveals around the cursor.
- `markdown`: raw Markdown editing. Built-in rendering plugins are skipped.
- `preview`: rendered Markdown view. Markdown syntax does not reveal on click or selection; code blocks, tables, images, headings, links, and inline formatting stay rendered.

Public API:

```ts
mode?: 'live' | 'markdown' | 'preview';
onModeChange?: (mode: GalleyMode) => void;
```

If `mode` is omitted, the toolbar mode toggle manages local mode state. If `mode` is provided, the toggle calls `onModeChange` and waits for the parent to update the prop.

`editable={false}` always forces effective `preview` mode. This makes readonly editor instances behave as full rendered Markdown views.

### Footer Tooltip

The logo tooltip text becomes:

```text
Galley Editor v.{version} by Inky Quill
```

The logo remains an inline React SVG component using `currentColor`.

## Architecture

`GalleyEditor` resolves an `effectiveMode` from `editable`, `mode`, and local mode state. The value is passed into `EditorController` settings and through `GalleyRenderContext`.

`EditorController` skips render plugins in `markdown` mode. In `preview` mode, the editor is read-only and plugins receive `mode: 'preview'`; built-in plugins use that context to suppress their reveal strategies.

Surface customization is handled by the React wrapper only. The controller remains focused on CodeMirror state and plugin configuration.

## Testing

- React wrapper tests cover icon nodes, icon render functions, surface class/style/padding variables, mode toggling, markdown mode, preview mode, readonly preview forcing, and tooltip text.
- Plugin tests cover preview behavior for code fences, tables, and images while the selection is inside the rendered block.
- Theme tests cover the expanded canonical CSS variable contract.

## Out of Scope

- Bundling any icon pack.
- A separate markdown-to-HTML rendering engine.
- HTML source editing.
- Exporting rendered HTML strings.
