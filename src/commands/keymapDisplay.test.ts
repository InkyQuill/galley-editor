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
