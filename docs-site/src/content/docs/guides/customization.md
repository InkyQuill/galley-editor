---
title: Customization
description: Customize Galley themes, toolbar controls, footer widgets, and surface styling.
---

Galley is designed to fit your app, not the other way around. Import the base stylesheet for a polished default, then use CSS variables and semantic classes to tune the surface.

```tsx
<GalleyEditor
  className="workspace-editor"
  value={markdown}
  onChange={setMarkdown}
/>
```

```css
.workspace-editor {
  --ge-color-text: #172033;
  --ge-color-link: #0f766e;
  --ge-color-focus-ring: #0f766e;
  --ge-font-body: Inter, ui-sans-serif, system-ui, sans-serif;
  --ge-content-padding: 42px 56px;
}

.workspace-editor[data-theme='dark'] {
  --ge-color-text: #e6edf7;
  --ge-color-link: #5eead4;
  --ge-color-focus-ring: #5eead4;
}
```

## Surface Styling

Use `surface` for focused shell changes when you do not need a full theme class.

```tsx
<GalleyEditor
  value={markdown}
  onChange={setMarkdown}
  surface={{
    background: 'linear-gradient(135deg, rgba(255,255,255,.76), rgba(232,241,255,.52))',
    backdropFilter: 'blur(22px) saturate(1.25)',
    borderColor: 'rgba(120, 140, 170, .35)',
    contentPadding: '44px 58px',
    toolbarPadding: '10px 14px',
    footerPadding: '6px 12px',
  }}
/>
```

## Toolbar

Disable the built-in toolbar:

```tsx
<GalleyEditor toolbar={false} />
```

Add custom controls before or after the built-in controls:

```tsx
<GalleyEditor
  toolbar={{
    after: ({ execCommand, canEdit }) => (
      <button
        className="ge-toolbar-button"
        disabled={!canEdit}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => execCommand('insertHr')}
      >
        Section
      </button>
    ),
  }}
/>
```

You can use inline SVGs, your own icon components, or an icon pack such as Lucide in these slots. Keep `onMouseDown={(event) => event.preventDefault()}` on toolbar buttons so the editor selection stays in place before the command runs.

## Footer

Disable the footer:

```tsx
<GalleyEditor footer={false} />
```

Add footer widgets:

```tsx
<GalleyEditor
  footer={{
    after: ({ mode, wordCount, characterCount }) => (
      <span>
        {mode} / {wordCount} words / {characterCount} characters
      </span>
    ),
  }}
/>
```

The default footer includes word count, character count, and the Galley logo tooltip. Footer slots are useful for document status, sync state, current mode, or app-specific metadata.
