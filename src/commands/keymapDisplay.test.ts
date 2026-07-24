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
    ["Cmd-b", "mac", "⌘B"],
    ["Cmd-b", "other", "Cmd+B"],
    ["Meta-b", "mac", "⌘B"],
    ["Meta-b", "other", "Meta+B"],
    ["Mod-Shift-z", "mac", "⇧⌘Z"],
    ["Mod-Shift-z", "other", "Ctrl+Shift+Z"],
    ["Alt-ArrowUp", "mac", "⌥↑"],
    ["Alt-ArrowUp", "other", "Alt+↑"],
    ["Mod-k Mod-c", "mac", "⌘K ⌘C"],
    ["Mod-k Mod-c", "other", "Ctrl+K Ctrl+C"],
  ] as const)("formats %s for %s", (key, platform, expected) => {
    expect(formatKeybinding(key, platform)).toBe(expected);
  });

  it("finds the key carrying command metadata", () => {
    expect(findCommandKey(DEFAULT_KEYMAP, "toggleBold")).toBe("Mod-b");
    expect(findCommandKey(DEFAULT_KEYMAP, "insertTable")).toBeUndefined();
  });

  it.each([
    ["mac", "Cmd-b"],
    ["win", "Ctrl-Alt-b"],
    ["linux", "Ctrl-Shift-b"],
    ["other", "Mod-b"],
  ] as const)(
    "prefers the %s override and otherwise falls back to the generic key",
    (platform, expected) => {
      const binding = {
        command: "toggleBold",
        key: "Mod-b",
        mac: "Cmd-b",
        win: "Ctrl-Alt-b",
        linux: "Ctrl-Shift-b",
      } as const;

      expect(findCommandKey([binding], "toggleBold", platform)).toBe(expected);
    },
  );

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
