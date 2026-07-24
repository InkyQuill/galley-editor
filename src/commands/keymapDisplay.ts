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
