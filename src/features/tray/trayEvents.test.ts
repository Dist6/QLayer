import { describe, expect, it } from "vitest";

import {
  QOLAYER_TRAY_ACTION_EVENT,
  QOLAYER_TRAY_STATUS_EVENT,
  parseTrayActionPayload,
  parseTrayStatus,
  trayActionLabels,
  type TrayAction,
} from "./trayEvents";

describe("tray events", () => {
  it("uses one stable event name for tray actions", () => {
    expect(QOLAYER_TRAY_ACTION_EVENT).toBe("qolayer://tray-action");
  });

  it("uses one stable event name for tray status updates", () => {
    expect(QOLAYER_TRAY_STATUS_EVENT).toBe("qolayer://tray-status");
  });

  it("parses supported tray action payloads", () => {
    const actions: TrayAction[] = ["openCodex", "restoreAudio", "showAbout"];

    for (const action of actions) {
      expect(parseTrayActionPayload({ action })).toEqual({ ok: true, action });
    }
  });

  it("rejects unsupported tray action payloads", () => {
    expect(parseTrayActionPayload({ action: "quit" })).toEqual({
      ok: false,
      message: "Unsupported tray action payload.",
    });
    expect(parseTrayActionPayload(null)).toEqual({
      ok: false,
      message: "Unsupported tray action payload.",
    });
  });

  it("keeps labels English-only and user-facing", () => {
    expect(trayActionLabels.openCodex).toBe("Open Codex / ChatGPT");
    expect(trayActionLabels.restoreAudio).toBe("Restore Audio");
    expect(trayActionLabels.showAbout).toBe("About QoLayer");
  });

  it("parses tray status from native command results", () => {
    expect(parseTrayStatus({ available: true, message: "System tray is available." })).toEqual({
      available: true,
      message: "System tray is available.",
    });
  });

  it("falls back for invalid tray status payloads", () => {
    expect(parseTrayStatus({ available: "yes" })).toEqual({
      available: false,
      message: "Tray status is unavailable.",
    });
  });
});
