import { describe, expect, it } from "vitest";

import {
  getGlobalHotkeyStatusLabel,
  parseGlobalHotkeyActionPayload,
  parseGlobalHotkeyStatus,
} from "./globalHotkeyEvents";

describe("global hotkey events", () => {
  it("parses start Voice Flow actions", () => {
    expect(parseGlobalHotkeyActionPayload({ action: "startVoiceFlow" })).toEqual({
      ok: true,
      action: "startVoiceFlow",
    });
  });

  it("rejects unsupported action payloads", () => {
    expect(parseGlobalHotkeyActionPayload({ action: "restoreAudio" })).toEqual({
      ok: false,
      message: "Unsupported global hotkey action payload.",
    });
  });

  it("parses valid registration status payloads", () => {
    expect(
      parseGlobalHotkeyStatus({
        state: "active",
        shortcut: "Ctrl+Alt+Space",
        message: "Global hotkey is active.",
      }),
    ).toEqual({
      state: "active",
      shortcut: "Ctrl+Alt+Space",
      message: "Global hotkey is active.",
    });
  });

  it("falls back to not available for invalid status payloads", () => {
    expect(parseGlobalHotkeyStatus({ state: "ready" })).toEqual({
      state: "notAvailable",
      shortcut: "Ctrl+Alt+Space",
      message: "Global hotkey status is unavailable.",
    });
  });

  it("returns human labels for registration states", () => {
    expect(getGlobalHotkeyStatusLabel("active")).toBe("Active");
    expect(getGlobalHotkeyStatusLabel("failed")).toBe("Failed");
    expect(getGlobalHotkeyStatusLabel("notAvailable")).toBe("Not available");
  });
});
