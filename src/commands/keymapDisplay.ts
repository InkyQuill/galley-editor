import type { KeyBinding } from "@codemirror/view";
import type { BuiltinCommand, GalleyEditorProps } from "../types";
import type { GalleyKeyBinding } from "./index";

export type ShortcutPlatform = "mac" | "win" | "linux" | "other";

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
  platform: ShortcutPlatform = "other",
): string | undefined {
  const binding = bindings.find(
    (binding) =>
      "command" in binding &&
      (binding as GalleyKeyBinding).command === command,
  );

  if (!binding) return undefined;
  if (platform === "mac") return binding.mac ?? binding.key;
  if (platform === "win") return binding.win ?? binding.key;
  if (platform === "linux") return binding.linux ?? binding.key;
  return binding.key;
}

export function formatKeybinding(
  key: string,
  platform: ShortcutPlatform,
): string {
  return key
    .split(" ")
    .map((stroke) => formatKeybindingStroke(stroke, platform))
    .join(" ");
}

function formatKeybindingStroke(
  stroke: string,
  platform: ShortcutPlatform,
): string {
  const parts = stroke.split("-");
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
      modifiers.includes("Mod") ||
      modifiers.includes("Cmd") ||
      modifiers.includes("Meta")
        ? "⌘"
        : "",
    ].join("");
    return `${symbols}${displayKey}`;
  }

  const labels = [
    modifiers.includes("Mod") || modifiers.includes("Ctrl") ? "Ctrl" : "",
    modifiers.includes("Cmd") ? "Cmd" : "",
    modifiers.includes("Meta") ? "Meta" : "",
    modifiers.includes("Alt") ? "Alt" : "",
    modifiers.includes("Shift") ? "Shift" : "",
  ].filter(Boolean);
  return [...labels, displayKey].join("+");
}
