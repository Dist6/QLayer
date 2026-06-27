import { describe, expect, it } from "vitest";

import { defaultSettings } from "../settings/defaultSettings";
import type { AudioController, CodexController, KeyboardController } from "./controllers";
import { startVoiceFlow, restoreVoiceFlowAudio } from "./voiceFlowService";

const keyboard: KeyboardController = {
  triggerDictationShortcut: async () => ({
    ok: true,
    value: {
      status: "dictationSent",
      message: "Dictation shortcut sent.",
    },
  }),
};

const unavailableKeyboard: KeyboardController = {
  triggerDictationShortcut: async () => ({
    ok: false,
    reason: "notImplemented",
    message: "Dictation automation is not available.",
  }),
};

describe("Voice Flow service", () => {
  it("starts with disabled audio and opens Codex", async () => {
    const audio: AudioController = {
      prepareAudio: async () => ({
        ok: true,
        value: {
          status: "audioDisabled",
          message: "Audio unchanged.",
        },
      }),
      restoreAudio: async () => ({
        ok: true,
        value: { status: "nothingToRestore", message: "Nothing to restore." },
      }),
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
      "dictationSent",
      "ready",
    ]);
    expect(result.steps.map((step) => step.message)).toEqual([
      "Audio unchanged.",
      "Opening Codex.",
      "Codex opened.",
      "Dictation shortcut sent.",
      "Codex opened. Dictation shortcut sent.",
    ]);
  });

  it("lowers audio before opening Codex", async () => {
    const audio: AudioController = {
      prepareAudio: async () => ({
        ok: true,
        value: { status: "audioDucked", message: "Audio lowered." },
      }),
      restoreAudio: async () => ({
        ok: true,
        value: { status: "restored", message: "Audio restored." },
      }),
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

    expect(result.status).toBe("ready");
    expect(result.steps.map((step) => step.message)).toContain("Audio lowered.");
    expect(result.steps.at(-1)?.message).toBe(
      "Audio lowered. Codex opened. Dictation shortcut sent.",
    );
  });

  it("mutes audio before opening Codex", async () => {
    const audio: AudioController = {
      prepareAudio: async () => ({
        ok: true,
        value: { status: "audioMuted", message: "Audio muted." },
      }),
      restoreAudio: async () => ({
        ok: true,
        value: { status: "restored", message: "Audio restored." },
      }),
    };
    const codex: CodexController = {
      openCodex: async () => ({ ok: true, value: undefined }),
      openSettings: async () => ({ ok: true, value: undefined }),
      openNewThread: async () => ({ ok: true, value: undefined }),
    };

    const result = await startVoiceFlow({
      settings: {
        ...defaultSettings,
        voiceFlow: { ...defaultSettings.voiceFlow, audioMode: "mute" },
      },
      audio,
      codex,
      keyboard,
    });

    expect(result.status).toBe("ready");
    expect(result.steps.map((step) => step.message)).toContain("Audio muted.");
    expect(result.steps.at(-1)?.message).toBe(
      "Audio muted. Codex opened. Dictation shortcut sent.",
    );
  });

  it("reports unavailable dictation automation without faking success", async () => {
    const audio: AudioController = {
      prepareAudio: async () => ({
        ok: true,
        value: {
          status: "audioDisabled",
          message: "Audio unchanged.",
        },
      }),
      restoreAudio: async () => ({
        ok: true,
        value: { status: "nothingToRestore", message: "Nothing to restore." },
      }),
    };
    const codex: CodexController = {
      openCodex: async () => ({ ok: true, value: undefined }),
      openSettings: async () => ({ ok: true, value: undefined }),
      openNewThread: async () => ({ ok: true, value: undefined }),
    };

    const result = await startVoiceFlow({
      settings: defaultSettings,
      audio,
      codex,
      keyboard: unavailableKeyboard,
    });

    expect(result.status).toBe("ready");
    expect(result.steps.map((step) => step.status)).toEqual([
      "audioDisabled",
      "openingCodex",
      "codexOpened",
      "dictationUnavailable",
      "ready",
    ]);
    expect(result.steps.at(-1)?.message).toBe(
      "Codex opened. Dictation automation is not available.",
    );
  });

  it("reports unavailable audio control without faking success", async () => {
    const audio: AudioController = {
      prepareAudio: async () => ({
        ok: false,
        reason: "notImplemented",
        message: "Audio control is not available.",
      }),
      restoreAudio: async () => ({
        ok: true,
        value: { status: "nothingToRestore", message: "Nothing to restore." },
      }),
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
    expect(result.steps.at(-1)).toEqual({
      status: "audioUnavailable",
      message: "Audio control is not available.",
    });
  });

  it("reports Codex open failures", async () => {
    const audio: AudioController = {
      prepareAudio: async () => ({
        ok: true,
        value: { status: "audioDisabled", message: "Audio disabled." },
      }),
      restoreAudio: async () => ({
        ok: true,
        value: { status: "nothingToRestore", message: "Nothing to restore." },
      }),
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
      prepareAudio: async () => ({
        ok: true,
        value: { status: "audioDisabled", message: "Audio disabled." },
      }),
      restoreAudio: async () => ({
        ok: true,
        value: { status: "nothingToRestore", message: "Nothing to restore." },
      }),
    };
    const codex: CodexController = {
      openCodex: async () => ({ ok: true, value: undefined }),
      openSettings: async () => ({ ok: true, value: undefined }),
      openNewThread: async () => ({ ok: true, value: undefined }),
    };
    const failingKeyboard: KeyboardController = {
      triggerDictationShortcut: async () => ({
        ok: false,
        reason: "failed",
        message: "Dictation shortcut could not be sent.",
      }),
    };

    const result = await startVoiceFlow({
      settings: defaultSettings,
      audio,
      codex,
      keyboard: failingKeyboard,
    });

    expect(result.status).toBe("failed");
    expect(result.steps.at(-1)).toEqual({
      status: "failed",
      message: "Dictation shortcut could not be sent.",
    });
  });

  it("restores audio through the audio controller", async () => {
    const audio: AudioController = {
      prepareAudio: async () => ({
        ok: true,
        value: { status: "audioDisabled", message: "Audio disabled." },
      }),
      restoreAudio: async () => ({
        ok: true,
        value: { status: "restored", message: "Audio restored." },
      }),
    };

    const result = await restoreVoiceFlowAudio(audio);

    expect(result).toEqual({ status: "restored", message: "Audio restored." });
  });

  it("reports restore failures", async () => {
    const audio: AudioController = {
      prepareAudio: async () => ({
        ok: true,
        value: { status: "audioDisabled", message: "Audio disabled." },
      }),
      restoreAudio: async () => ({ ok: false, reason: "failed", message: "Restore failed." }),
    };

    const result = await restoreVoiceFlowAudio(audio);

    expect(result).toEqual({ status: "failed", message: "Restore failed." });
  });

  it("reports when there is nothing to restore", async () => {
    const audio: AudioController = {
      prepareAudio: async () => ({
        ok: true,
        value: { status: "audioDisabled", message: "Audio disabled." },
      }),
      restoreAudio: async () => ({
        ok: true,
        value: { status: "nothingToRestore", message: "Nothing to restore." },
      }),
    };

    const result = await restoreVoiceFlowAudio(audio);

    expect(result).toEqual({
      status: "nothingToRestore",
      message: "Nothing to restore.",
    });
  });
});
