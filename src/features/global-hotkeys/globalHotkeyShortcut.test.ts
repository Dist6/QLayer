import { describe, expect, it } from "vitest";

import {
  captureGlobalHotkey,
  getShortcutKeycaps,
  validateGlobalHotkey,
} from "./globalHotkeyShortcut";

describe("global hotkey shortcut", () => {
  it("captures a canonical modifier and main-key chord", () => {
    expect(
      captureGlobalHotkey({
        altKey: true,
        code: "KeyM",
        ctrlKey: true,
        key: "m",
        metaKey: false,
        shiftKey: false,
      }),
    ).toEqual({ ok: true, shortcut: "Ctrl+Alt+M" });
  });

  it("waits while only modifiers are held", () => {
    expect(
      captureGlobalHotkey({
        altKey: true,
        code: "AltLeft",
        ctrlKey: true,
        key: "Alt",
        metaKey: false,
        shiftKey: false,
      }),
    ).toEqual({ ok: false, reason: "incomplete" });
  });

  it("captures Ctrl+Win as the dedicated modifier-only Voice Flow shortcut", () => {
    expect(
      captureGlobalHotkey({
        altKey: false,
        code: "MetaLeft",
        ctrlKey: true,
        key: "Meta",
        metaKey: true,
        shiftKey: false,
      }),
    ).toEqual({ ok: true, shortcut: "Ctrl+Win" });
  });

  it("treats Escape as cancellation", () => {
    expect(
      captureGlobalHotkey({
        altKey: false,
        code: "Escape",
        ctrlKey: false,
        key: "Escape",
        metaKey: false,
        shiftKey: false,
      }),
    ).toEqual({ ok: false, reason: "cancelled" });
  });

  it.each([
    ["Ctrl+1", "Number keys are reserved for chat selection."],
    ["Meta+Alt+M", "The Windows key is supported only in Ctrl+Win."],
    ["Ctrl+Win+M", "The Windows key is supported only in Ctrl+Win."],
    ["Shift+M", "Use Ctrl or Alt in the shortcut."],
    ["Ctrl+Shift+D", "This shortcut is reserved for Codex dictation."],
    ["Alt+F4", "This shortcut is reserved by Windows."],
    ["Ctrl+F12", "F12 is reserved by Windows."],
  ])("rejects %s", (shortcut, message) => {
    expect(validateGlobalHotkey(shortcut)).toEqual({ ok: false, message });
  });

  it.each(["Ctrl+Win", "Ctrl+Alt+Space", "Ctrl+Shift+M", "Alt+F8", "Ctrl+ArrowUp"])(
    "accepts %s",
    (shortcut) => {
      expect(validateGlobalHotkey(shortcut)).toEqual({ ok: true, shortcut });
    },
  );

  it("returns compact display keycaps", () => {
    expect(getShortcutKeycaps("Ctrl+Win")).toEqual(["Ctrl", "Win"]);
    expect(getShortcutKeycaps("Ctrl+Alt+Space")).toEqual(["Ctrl", "Alt", "Space"]);
    expect(getShortcutKeycaps("Ctrl+ArrowUp")).toEqual(["Ctrl", "↑"]);
  });
});
