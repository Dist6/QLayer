import { describe, expect, it } from "vitest";

import { defaultSettings } from "./defaultSettings";
import { parseStoredSettings, validateSettings } from "./settingsValidation";

describe("settings defaults", () => {
  it("uses conservative v0.1 defaults", () => {
    expect(defaultSettings.codex.dictationShortcut).toBe("Ctrl+Shift+D");
    expect(defaultSettings.voiceFlow.hotkey).toBe("Ctrl+Win");
    expect(defaultSettings.voiceFlow.audioMode).toBe("disabled");
    expect(defaultSettings.voiceFlow.listeningVolumePercent).toBe(20);
    expect(defaultSettings.general).toEqual({
      launchAtStartup: false,
      closeToTray: true,
      keepVisible: false,
    });
    expect(defaultSettings.localhostManager.autoRefreshSeconds).toBe(30);
  });
});

describe("settings validation", () => {
  it("accepts valid settings", () => {
    const result = validateSettings(defaultSettings);

    expect(result.ok).toBe(true);
  });

  it("falls back to defaults for corrupted JSON", () => {
    const parsed = parseStoredSettings("{not-json");

    expect(parsed.settings).toEqual(defaultSettings);
    expect(parsed.recovered).toBe(true);
  });

  it("merges partial valid stored settings with defaults", () => {
    const parsed = parseStoredSettings(
      JSON.stringify({
        general: {
          launchAtStartup: true,
          closeToTray: false,
        },
        voiceFlow: {
          audioMode: "mute",
          listeningVolumePercent: 35,
        },
      }),
    );

    expect(parsed.settings.voiceFlow.audioMode).toBe("mute");
    expect(parsed.settings.voiceFlow.listeningVolumePercent).toBe(35);
    expect(parsed.settings.general).toEqual({
      launchAtStartup: true,
      closeToTray: false,
      keepVisible: false,
    });
    expect(parsed.settings.codex.dictationShortcut).toBe("Ctrl+Shift+D");
  });

  it("preserves the Keep QLayer visible preference", () => {
    const parsed = parseStoredSettings(
      JSON.stringify({
        ...defaultSettings,
        general: { ...defaultSettings.general, keepVisible: true },
      }),
    );

    expect(parsed.settings.general.keepVisible).toBe(true);
    expect(parsed.recovered).toBe(false);
  });

  it.each([5, 20, 50])("accepts a %i percent listening volume", (value) => {
    const parsed = parseStoredSettings(
      JSON.stringify({
        ...defaultSettings,
        voiceFlow: { ...defaultSettings.voiceFlow, listeningVolumePercent: value },
      }),
    );

    expect(parsed.settings.voiceFlow.listeningVolumePercent).toBe(value);
    expect(parsed.recovered).toBe(false);
  });

  it.each([4, 51, 20.5])("rejects an invalid listening volume of %s", (value) => {
    const parsed = parseStoredSettings(
      JSON.stringify({
        ...defaultSettings,
        voiceFlow: { ...defaultSettings.voiceFlow, listeningVolumePercent: value },
      }),
    );

    expect(parsed.settings.voiceFlow.listeningVolumePercent).toBe(20);
    expect(parsed.recovered).toBe(true);
  });

  it("rejects invalid enum values and keeps defaults", () => {
    const parsed = parseStoredSettings(
      JSON.stringify({
        voiceFlow: {
          audioMode: "loud",
        },
      }),
    );

    expect(parsed.settings.voiceFlow.audioMode).toBe("disabled");
    expect(parsed.recovered).toBe(true);
  });

  it("rejects unsupported dictation shortcuts and keeps the safe default", () => {
    const parsed = parseStoredSettings(
      JSON.stringify({
        codex: {
          enabled: true,
          dictationShortcut: "Ctrl+M",
        },
      }),
    );

    expect(parsed.settings.codex.dictationShortcut).toBe("Ctrl+Shift+D");
    expect(parsed.recovered).toBe(true);
  });

  it("preserves a supported custom Voice Flow shortcut", () => {
    const parsed = parseStoredSettings(
      JSON.stringify({
        ...defaultSettings,
        voiceFlow: { ...defaultSettings.voiceFlow, hotkey: "Ctrl+Shift+M" },
      }),
    );

    expect(parsed.settings.voiceFlow.hotkey).toBe("Ctrl+Shift+M");
    expect(parsed.recovered).toBe(false);
  });

  it.each([null, 15, 30, 60] as const)("accepts localhost refresh interval %s", (value) => {
    const parsed = parseStoredSettings(
      JSON.stringify({
        ...defaultSettings,
        localhostManager: { autoRefreshSeconds: value },
      }),
    );

    expect(parsed.settings.localhostManager.autoRefreshSeconds).toBe(value);
    expect(parsed.recovered).toBe(false);
  });

  it("recovers an unsupported localhost refresh interval", () => {
    const parsed = parseStoredSettings(
      JSON.stringify({
        ...defaultSettings,
        localhostManager: { autoRefreshSeconds: 1 },
      }),
    );

    expect(parsed.settings.localhostManager.autoRefreshSeconds).toBe(30);
    expect(parsed.recovered).toBe(true);
  });

  it("migrates the legacy default Voice Flow shortcut", () => {
    const parsed = parseStoredSettings(
      JSON.stringify({
        ...defaultSettings,
        voiceFlow: { ...defaultSettings.voiceFlow, hotkey: "Ctrl+Alt+Space" },
      }),
    );

    expect(parsed.settings.voiceFlow.hotkey).toBe("Ctrl+Win");
  });

  it.each(["Ctrl+1", "Meta+Alt+M", "Ctrl+Shift+D", "Shift+M"])(
    "recovers safely from unsupported Voice Flow shortcut %s",
    (hotkey) => {
      const parsed = parseStoredSettings(
        JSON.stringify({
          ...defaultSettings,
          voiceFlow: { ...defaultSettings.voiceFlow, hotkey },
        }),
      );

      expect(parsed.settings.voiceFlow.hotkey).toBe("Ctrl+Win");
      expect(parsed.recovered).toBe(true);
    },
  );
});
