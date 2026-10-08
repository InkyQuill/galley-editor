import type { ThemeTokens } from "./tokens.js";

// Edda quiet workshop palette, aligned with Open Edda DESIGN.md.
export const eddaLightTokens: ThemeTokens = {
  "app": {
    "bg": "#f1f2ee",
    "text": "#293831",
    "panel": "#fcfcf8",
    "panelMuted": "#fffefa",
    "border": "#dce1d9",
    "textMuted": "#667169",
    "tabText": "#234d3c",
    "hover": "#e8ede5",
    "focus": "#376452",
    "errorBg": "#fcfcf8",
    "errorBorder": "#a33332",
    "errorText": "#a33332",
    "dialogShadow": "0 16px 56px #17221d26",
    "backdrop": "#1b282955"
  },
  "editor": {
    "text": "#293831",
    "textMuted": "#667169",
    "bg": "#fcfcf8",
    "surface": "#f1f2ee",
    "surfaceElevated": "#fffefa",
    "border": "#dce1d9",
    "link": "#376452",
    "linkHover": "#234d3c",
    "selection": "#cfdfd2",
    "caret": "#293831",
    "focusRing": "#376452",
    "scrollbarThumb": "#dce1d9",
    "scrollbarThumbHover": "#667169"
  },
  "markdown": {
    "codeFg": "#293831",
    "codeBg": "#e8ede5",
    "codeFenceBg": "#f1f2ee",
    "codeHeaderBg": "#e8ede5",
    "blockquoteBorder": "#376452",
    "blockquoteFg": "#667169",
    "divider": "#dce1d9",
    "tableBorder": "#dce1d9",
    "checkboxAccent": "#376452"
  },
  "syntax": {
    "keyword": "#234d3c",
    "string": "#376452",
    "number": "#234d3c",
    "comment": "#667169",
    "variable": "#293831",
    "type": "#234d3c",
    "function": "#376452",
    "operator": "#293831",
    "punctuation": "#667169"
  }
};

export const eddaDarkTokens: ThemeTokens = {
  "app": {
    "bg": "#202623",
    "text": "#e0e6dd",
    "panel": "#262d29",
    "panelMuted": "#303833",
    "border": "#404b43",
    "textMuted": "#a8b5aa",
    "tabText": "#c3e2cd",
    "hover": "#333e36",
    "focus": "#aacdb7",
    "errorBg": "#262d29",
    "errorBorder": "#ffb2aa",
    "errorText": "#ffb2aa",
    "dialogShadow": "0 16px 56px #0006",
    "backdrop": "#0b110dbb"
  },
  "editor": {
    "text": "#e0e6dd",
    "textMuted": "#a8b5aa",
    "bg": "#262d29",
    "surface": "#202623",
    "surfaceElevated": "#303833",
    "border": "#404b43",
    "link": "#aacdb7",
    "linkHover": "#c3e2cd",
    "selection": "#42604b",
    "caret": "#e0e6dd",
    "focusRing": "#aacdb7",
    "scrollbarThumb": "#404b43",
    "scrollbarThumbHover": "#a8b5aa"
  },
  "markdown": {
    "codeFg": "#e0e6dd",
    "codeBg": "#333e36",
    "codeFenceBg": "#202623",
    "codeHeaderBg": "#333e36",
    "blockquoteBorder": "#aacdb7",
    "blockquoteFg": "#a8b5aa",
    "divider": "#404b43",
    "tableBorder": "#404b43",
    "checkboxAccent": "#aacdb7"
  },
  "syntax": {
    "keyword": "#c3e2cd",
    "string": "#aacdb7",
    "number": "#c3e2cd",
    "comment": "#a8b5aa",
    "variable": "#e0e6dd",
    "type": "#c3e2cd",
    "function": "#aacdb7",
    "operator": "#e0e6dd",
    "punctuation": "#a8b5aa"
  }
};

