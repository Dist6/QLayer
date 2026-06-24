import { describe, expect, it } from "vitest";

import { defaultSettings } from "../settings/defaultSettings";
import type { AudioController, CodexController, KeyboardController } from "./controllers";
import { startVoiceFlow, restoreVoiceFlowAudio } from "./voiceFlowService";

const keyboard: KeyboardController = {
  triggerDictationShortcut: () => ({
    ok: false,
    reason: "notImplemented",
    message: "Not available yet.",
  }),
};

describe("Voice Flow service", () => {
  it("starts with disabled audio and opens Codex", async () => {
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

    const result = await startVoiceFlow({ settings: defaultSettings, audio, codex, keyboard });

    expect(result.status).toBe("ready");
    expect(result.steps.map((step) => step.status)).toEqual([
      "audioDisabled",
      "openingCodex",
      "dictationUnavailable",
      "ready",
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
});
