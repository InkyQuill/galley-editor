# @inkyquill/galley-themes

Built-in Galley theme catalog: design tokens, light/dark palettes, and the CSS variable mapping shared by Galley apps and [`@inkyquill/galley-editor`](https://www.npmjs.com/package/@inkyquill/galley-editor). Dependency-free and runtime-agnostic — no React and no DOM APIs.

## Installation

```bash
npm install @inkyquill/galley-themes
```

## Usage

```ts
import {
  BUILT_IN_THEMES,
  DEFAULT_LIGHT_THEME_ID,
  DEFAULT_DARK_THEME_ID,
  getTheme,
  isThemeId,
  listThemesByScheme,
  themeToCssVariables,
} from '@inkyquill/galley-themes';

const theme = getTheme('galley-light'); // ThemeDefinition | undefined

// Flat CSS custom properties for the editor (--ge-*) and app (--app-*) contracts.
const variables = themeToCssVariables(theme!);
// { colorScheme: 'light', '--app-bg': '#f6f4ef', '--ge-color-bg': '#fbfaf7', ... }
```

`ThemeCssVariables` is a plain style object (`` `{ colorScheme: string } & Record<`--${string}`, string>` ``), so the result can be spread onto a React `style` prop or applied to a DOM element with `Object.assign(element.style, variables)`.

`thoth-light` and `thoth-dark` adapt the approved [Thoth Palette](https://git.inkyquill.net/inky/thoth-palette) for Galley's token contract. The palette repository is the source of color values and also provides web, terminal, Kate, and VS Code exports. These themes are optional catalog entries; existing defaults stay `galley-light` and `galley-dark`.

## API

| Export | Kind | Description |
| --- | --- | --- |
| `ThemeId`, `ThemeScheme`, `ThemeTokens`, `ThemeDefinition`, `ThemeCssVariables` | types | Theme type contract. |
| `BUILT_IN_THEMES` | value | Frozen catalog of the 15 built-in themes, including Thoth Light and Thoth Dark. |
| `DEFAULT_LIGHT_THEME_ID`, `DEFAULT_DARK_THEME_ID`, `DEFAULT_CONSTANT_THEME_ID` | values | Default theme id constants (`galley-light` / `galley-dark`). |
| `getTheme(id)` | function | Look up a built-in theme by id. |
| `listThemesByScheme(scheme)` | function | All built-in themes for `"light"` or `"dark"`. |
| `isThemeId(value)` | function | Type guard for built-in theme ids (safe for persisted data). |
| `themeToCssVariables(theme)` | function | Map theme tokens to `--app-*` / `--ge-*` CSS variables. |

## License

MIT — see [LICENSE](./LICENSE).

## Edda workshop

The `edda-light` and `edda-dark` catalog entries share the `Edda` family. They
match Open Edda's quiet writing workspace and can be selected with
`getTheme('edda-light')` / `getTheme('edda-dark')`, then passed to
`themeToCssVariables`. Hosts retain control of manuscript font, width and
padding; the catalog supplies semantic colors for the shell, editor, menus,
selection, focus and Markdown. Select the variant matching the author's color
scheme; Galley's default theme IDs remain unchanged.
