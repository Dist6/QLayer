import { describe, expect, it } from "vitest";

import { defaultSettings } from "../settings/defaultSettings";
import type { AudioController, CodexController, KeyboardController } from "./controllers";
import { startVoiceFlow, restoreVoiceFlowAudio } from "./voiceFlowService";

const keyboard: KeyboardController = {
  triggerDictationShortcut: () => ({
    ok: false,
    reason: "notImplemented",
    message: "Dictation automation is planned for a later Windows-native pass.",
  }),
};

describe("Voice Flow service", () => {
  it("starts with disabled audio and opens Codex", async () => {
    const audio: AudioController = {
      prepareAudio: () => ({
        ok: true,
        value: {
          status: "audioDisabled",
          message: "Audio control is disabled. Planned audio ducking and muting were not used.",
        },
      }),
      restoreAudio: () => ({ ok: true, value: { status: "restored", message: "Restored." } }),
    };
    const codex: CodexController = {
      openCodex: async () => ({ ok: true, value: undefined }),
      openSettings: async () => ({ ok: true, value: undefined }),
      openNewThread: async () => ({ ok: true, value: undefined }),
    };

    const result = await startVoiceFlow({ settings: defaultSettings, audio, codex, keyboard });

    expect(result.status).toBe("ready");
    expect(result.steps.map((step) => step.status)).toEqual([
      "audioDisabled",
      "openingCodex",
      "codexOpened",
      "audioUnavailable",
      "dictationUnavailable",
      "ready",
    ]);
    expect(result.steps.map((step) => step.message)).toEqual([
      "Audio control is disabled. Planned audio ducking and muting were not used.",
      "Opening Codex.",
      "Codex opened.",
      "Audio control is planned for a later Windows-native pass.",
      "Dictation automation is planned for a later Windows-native pass.",
      "Voice Flow opened Codex. Audio control and dictation automation are still planned.",
    ]);
  });

  it("surfaces NotImplemented audio instead of silently succeeding", async () => {
    const audio: AudioController = {
      prepareAudio: () => ({
        ok: false,
        reason: "notImplemented",
        message: "Audio ducking is not implemented yet.",
      }),
      restoreAudio: () => ({ ok: true, value: { status: "restored", message: "Restored." } }),
    };
    const codex: CodexController = {
      openCodex: async () => ({ ok: true, value: undefined }),
      openSettings: async () => ({ ok: true, value: undefined }),
      openNewThread: async () => ({ ok: true, value: undefined }),
    };

    const result = await startVoiceFlow({
      settings: {
        ...defaultSettings,
        voiceFlow: { ...defaultSettings.voiceFlow, audioMode: "duck" },
      },
      audio,
      codex,
      keyboard,
    });

    expect(result.status).toBe("failed");
    expect(result.steps.at(-1)?.status).toBe("failed");
    expect(result.steps.at(-1)?.message).toContain("not implemented");
  });

  it("reports Codex open failures", async () => {
    const audio: AudioController = {
      prepareAudio: () => ({
        ok: true,
        value: { status: "audioDisabled", message: "Audio disabled." },
      }),
      restoreAudio: () => ({ ok: true, value: { status: "restored", message: "Restored." } }),
    };
    const codex: CodexController = {
      openCodex: async () => ({
        ok: false,
        reason: "failed",
        message: "Codex could not be opened.",
      }),
      openSettings: async () => ({ ok: true, value: undefined }),
      openNewThread: async () => ({ ok: true, value: undefined }),
    };

    const result = await startVoiceFlow({ settings: defaultSettings, audio, codex, keyboard });

    expect(result.status).toBe("failed");
    expect(result.steps.at(-1)).toEqual({
      status: "failed",
      message: "Codex could not be opened.",
    });
  });

  it("reports keyboard automation failures that are not NotImplemented", async () => {
    const audio: AudioController = {
      prepareAudio: () => ({
        ok: true,
        value: { status: "audioDisabled", message: "Audio disabled." },
      }),
      restoreAudio: () => ({ ok: true, value: { status: "restored", message: "Restored." } }),
    };
    const codex: CodexController = {
      openCodex: async () => ({ ok: true, value: undefined }),
      openSettings: async () => ({ ok: true, value: undefined }),
      openNewThread: async () => ({ ok: true, value: undefined }),
    };
    const failingKeyboard: KeyboardController = {
      triggerDictationShortcut: () => ({
        ok: false,
        reason: "failed",
        message: "Shortcut failed.",
      }),
    };

    const result = await startVoiceFlow({
      settings: defaultSettings,
      audio,
      codex,
      keyboard: failingKeyboard,
    });

    expect(result.status).toBe("failed");
    expect(result.steps.at(-1)).toEqual({ status: "failed", message: "Shortcut failed." });
  });

  it("restores audio through the audio controller", async () => {
    const audio: AudioController = {
      prepareAudio: () => ({
        ok: true,
        value: { status: "audioDisabled", message: "Audio disabled." },
      }),
      restoreAudio: () => ({ ok: true, value: { status: "restored", message: "Audio restored." } }),
    };

    const result = await restoreVoiceFlowAudio(audio);

    expect(result).toEqual({ status: "restored", message: "Audio restored." });
  });

  it("reports restore failures", async () => {
    const audio: AudioController = {
      prepareAudio: () => ({
        ok: true,
        value: { status: "audioDisabled", message: "Audio disabled." },
      }),
      restoreAudio: () => ({ ok: false, reason: "failed", message: "Restore failed." }),
    };

    const result = await restoreVoiceFlowAudio(audio);

    expect(result).toEqual({ status: "failed", message: "Restore failed." });
  });

  it("reports NotImplemented restore results without faking success", async () => {
    const audio: AudioController = {
      prepareAudio: () => ({
        ok: true,
        value: { status: "audioDisabled", message: "Audio disabled." },
      }),
      restoreAudio: () => ({
        ok: false,
        reason: "notImplemented",
        message: "Audio restore is planned for a later Windows-native pass.",
      }),
    };

    const result = await restoreVoiceFlowAudio(audio);

    expect(result).toEqual({
      status: "audioUnavailable",
      message: "Audio restore is planned for a later Windows-native pass.",
    });
  });
});
