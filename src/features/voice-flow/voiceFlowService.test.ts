import { describe, expect, it } from "vitest";

import { defaultSettings } from "../settings/defaultSettings";
import type {
  AudioController,
  KeyboardController,
  VoiceFlowStep,
  WindowController,
} from "./controllers";
import {
  restoreVoiceFlowAudio,
  startVoiceFlow,
  startVoiceFlowHold,
  stopVoiceFlowHold,
} from "./voiceFlowService";

const successfulKeyboard: KeyboardController = {
  triggerDictationShortcut: async () => ({
    ok: true,
    value: { status: "dictationSent", message: "Dictation shortcut sent." },
  }),
  pressDictationShortcut: async () => ({
    ok: true,
    value: { status: "dictationStarted", message: "Dictation shortcut is held." },
  }),
  releaseDictationShortcut: async () => ({
    ok: true,
    value: { status: "dictationStopped", message: "Dictation shortcut released." },
  }),
};

const focusedWindow: WindowController = {
  focusCodex: async () => ({
    ok: true,
    value: { status: "codexFocused", message: "Codex focused." },
  }),
  showQoLayer: async () => ({ ok: true, value: undefined }),
};

function createAudioController(
  prepared: VoiceFlowStep = { status: "audioDisabled", message: "Audio unchanged." },
  restored: VoiceFlowStep = { status: "restored", message: "Audio restored." },
): AudioController {
  return {
    prepareAudio: async () => ({ ok: true, value: prepared }),
    restoreAudio: async () => ({ ok: true, value: restored }),
  };
}

describe("Voice Flow service", () => {
  it("prepares audio, focuses Codex, and sends the tap shortcut", async () => {
    const events: string[] = [];
    const audio: AudioController = {
      prepareAudio: async () => {
        events.push("audio");
        return {
          ok: true,
          value: { status: "audioDisabled", message: "Audio unchanged." },
        };
      },
      restoreAudio: async () => ({
        ok: true,
        value: { status: "restored", message: "Audio restored." },
      }),
    };
    const window: WindowController = {
      focusCodex: async () => {
        events.push("focus");
        return {
          ok: true,
          value: { status: "codexFocused", message: "Codex focused." },
        };
      },
      showQoLayer: async () => ({ ok: true, value: undefined }),
    };
    const keyboard: KeyboardController = {
      ...successfulKeyboard,
      triggerDictationShortcut: async () => {
        events.push("dictation");
        return {
          ok: true,
          value: { status: "dictationSent", message: "Dictation shortcut sent." },
        };
      },
    };

    const result = await startVoiceFlow({
      settings: defaultSettings,
      audio,
      window,
      keyboard,
      waitAfterCodexFocus: async () => {
        events.push("wait-focus");
      },
    });

    expect(events).toEqual(["audio", "focus", "wait-focus", "dictation"]);
    expect(result.steps.map((step) => step.status)).toEqual([
      "audioDisabled",
      "focusingCodex",
      "codexFocused",
      "dictationSent",
      "ready",
    ]);
    expect(result.steps.at(-1)?.message).toBe("Codex focused. Dictation shortcut sent.");
  });

  it.each([
    ["duck", "audioDucked", "Audio lowered."],
    ["mute", "audioMuted", "Audio muted."],
  ] as const)("applies %s audio before focusing Codex", async (mode, status, message) => {
    const events: string[] = [];
    const audio: AudioController = {
      prepareAudio: async () => {
        events.push("audio");
        return { ok: true, value: { status, message } };
      },
      restoreAudio: async () => ({
        ok: true,
        value: { status: "restored", message: "Audio restored." },
      }),
    };
    const window: WindowController = {
      focusCodex: async () => {
        events.push("focus");
        return {
          ok: true,
          value: { status: "codexFocused", message: "Codex focused." },
        };
      },
      showQoLayer: async () => ({ ok: true, value: undefined }),
    };

    const result = await startVoiceFlow({
      settings: {
        ...defaultSettings,
        voiceFlow: { ...defaultSettings.voiceFlow, audioMode: mode },
      },
      audio,
      window,
      keyboard: successfulKeyboard,
      waitAfterCodexFocus: async () => undefined,
    });

    expect(events).toEqual(["audio", "focus"]);
    expect(result.steps.map((step) => step.status)).toContain(status);
    expect(result.steps.at(-1)?.message).toContain(message);
  });

  it("does not fake success when audio control is unavailable", async () => {
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

    const result = await startVoiceFlow({
      settings: defaultSettings,
      audio,
      window: focusedWindow,
      keyboard: successfulKeyboard,
    });

    expect(result.status).toBe("failed");
    expect(result.steps.at(-1)).toEqual({
      status: "audioUnavailable",
      message: "Audio control is not available.",
    });
  });

  it("reports unavailable dictation automation", async () => {
    const unavailableKeyboard: KeyboardController = {
      triggerDictationShortcut: async () => ({
        ok: false,
        reason: "notImplemented",
        message: "Dictation automation is not available.",
      }),
      pressDictationShortcut: async () => ({
        ok: false,
        reason: "notImplemented",
        message: "Dictation automation is not available.",
      }),
      releaseDictationShortcut: async () => ({
        ok: false,
        reason: "notImplemented",
        message: "Dictation automation is not available.",
      }),
    };

    const result = await startVoiceFlow({
      settings: defaultSettings,
      audio: createAudioController(),
      window: focusedWindow,
      keyboard: unavailableKeyboard,
      waitAfterCodexFocus: async () => undefined,
    });

    expect(result.status).toBe("dictationUnavailable");
    expect(result.steps.map((step) => step.status)).toContain("dictationUnavailable");
    expect(result.steps.at(-1)?.message).toBe("Dictation automation is not available.");
  });

  it("reports keyboard failures", async () => {
    const failingKeyboard: KeyboardController = {
      ...successfulKeyboard,
      triggerDictationShortcut: async () => ({
        ok: false,
        reason: "failed",
        message: "Dictation shortcut could not be sent.",
      }),
    };

    const result = await startVoiceFlow({
      settings: defaultSettings,
      audio: createAudioController(),
      window: focusedWindow,
      keyboard: failingKeyboard,
      waitAfterCodexFocus: async () => undefined,
    });

    expect(result.status).toBe("failed");
    expect(result.steps.at(-1)).toEqual({
      status: "failed",
      message: "Dictation shortcut could not be sent.",
    });
  });

  it("starts push-to-talk by holding the Codex shortcut", async () => {
    const result = await startVoiceFlowHold({
      settings: defaultSettings,
      audio: createAudioController(),
      window: focusedWindow,
      keyboard: successfulKeyboard,
      shouldContinue: () => true,
      waitAfterCodexFocus: async () => undefined,
    });

    expect(result.status).toBe("ready");
    expect(result.steps.map((step) => step.status)).toEqual([
      "audioDisabled",
      "focusingCodex",
      "codexFocused",
      "dictationStarted",
      "ready",
    ]);
    expect(result.steps.at(-1)?.message).toBe("Codex focused. Dictation is listening.");
  });

  it("does not press dictation after the hold ends during setup", async () => {
    const events: string[] = [];
    const keyboard: KeyboardController = {
      ...successfulKeyboard,
      pressDictationShortcut: async () => {
        events.push("press");
        return {
          ok: true,
          value: { status: "dictationStarted", message: "Dictation shortcut is held." },
        };
      },
    };

    const result = await startVoiceFlowHold({
      settings: defaultSettings,
      audio: createAudioController(),
      window: focusedWindow,
      keyboard,
      shouldContinue: () => false,
      waitAfterCodexFocus: async () => undefined,
    });

    expect(events).toEqual([]);
    expect(result.steps.at(-1)?.status).toBe("dictationStopped");
  });

  it("releases push-to-talk dictation", async () => {
    await expect(
      stopVoiceFlowHold(
        successfulKeyboard,
        createAudioController(),
        defaultSettings.codex.dictationShortcut,
      ),
    ).resolves.toEqual([
      {
        status: "dictationStopped",
        message: "Dictation shortcut released.",
      },
      {
        status: "restored",
        message: "Audio restored.",
      },
    ]);
  });

  it("restores audio", async () => {
    await expect(restoreVoiceFlowAudio(createAudioController())).resolves.toEqual({
      status: "restored",
      message: "Audio restored.",
    });
  });

  it("reports restore failures", async () => {
    const audio: AudioController = {
      prepareAudio: async () => ({
        ok: true,
        value: { status: "audioDisabled", message: "Audio unchanged." },
      }),
      restoreAudio: async () => ({
        ok: false,
        reason: "failed",
        message: "Restore failed.",
      }),
    };

    await expect(restoreVoiceFlowAudio(audio)).resolves.toEqual({
      status: "failed",
      message: "Restore failed.",
    });
  });

  it("reports when there is nothing to restore", async () => {
    const audio = createAudioController(
      { status: "audioDisabled", message: "Audio unchanged." },
      { status: "nothingToRestore", message: "Nothing to restore." },
    );

    await expect(restoreVoiceFlowAudio(audio)).resolves.toEqual({
      status: "nothingToRestore",
      message: "Nothing to restore.",
    });
  });
});
