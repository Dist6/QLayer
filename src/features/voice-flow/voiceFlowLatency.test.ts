import { describe, expect, it } from "vitest";

import { defaultSettings } from "../settings/defaultSettings";
import type { AudioController, KeyboardController, WindowController } from "./controllers";
import { startVoiceFlowHold, type StartVoiceFlowHoldInput } from "./voiceFlowService";

function createAudioController(events: string[], status: "audioDisabled" | "audioDucked") {
  return {
    prepareAudio: async () => {
      events.push("audio");
      return {
        ok: true as const,
        value: {
          status,
          message: status === "audioDucked" ? "Audio lowered." : "Audio unchanged.",
        },
      };
    },
    restoreAudio: async () => {
      events.push("restore");
      return {
        ok: true as const,
        value: { status: "restored" as const, message: "Audio restored." },
      };
    },
  } satisfies AudioController;
}

function createKeyboardController(events: string[]): KeyboardController {
  return {
    triggerDictationShortcut: async () => {
      events.push("tap");
      return {
        ok: true,
        value: { status: "dictationSent", message: "Dictation shortcut sent." },
      };
    },
    pressDictationShortcut: async () => {
      events.push("press");
      return {
        ok: true,
        value: { status: "dictationStarted", message: "Dictation shortcut is held." },
      };
    },
    releaseDictationShortcut: async () => {
      events.push("release");
      return {
        ok: true,
        value: { status: "dictationStopped", message: "Dictation shortcut released." },
      };
    },
  };
}

function asHoldInput(input: Record<string, unknown>): StartVoiceFlowHoldInput {
  return input as unknown as StartVoiceFlowHoldInput;
}

describe("Voice Flow latency and focus safety", () => {
  it("focuses an existing Codex window without invoking the Codex opener", async () => {
    const events: string[] = [];
    const window = {
      focusCodex: async () => {
        events.push("focus");
        return {
          ok: true as const,
          value: { status: "codexFocused" as const, message: "Codex focused." },
        };
      },
      showQLayer: async () => {
        events.push("show");
        return { ok: true as const, value: undefined };
      },
    } satisfies WindowController;

    const result = await startVoiceFlowHold(
      asHoldInput({
        settings: defaultSettings,
        audio: createAudioController(events, "audioDisabled"),
        codex: {
          openCodex: async () => {
            events.push("open");
            throw new Error("Voice Flow must not open Codex.");
          },
        },
        window,
        keyboard: createKeyboardController(events),
        shouldContinue: () => true,
        waitAfterCodexFocus: async () => {
          events.push("wait-focus");
        },
      }),
    );

    expect(result.status).toBe("ready");
    expect(events).toEqual(["audio", "focus", "wait-focus", "press"]);
  });

  it("restores audio, reveals QLayer, and never sends keys when Codex is unavailable", async () => {
    const events: string[] = [];
    const window = {
      focusCodex: async () => {
        events.push("focus");
        return {
          ok: true as const,
          value: {
            status: "waitingForCodex" as const,
            message: "No supported Codex or ChatGPT window was detected.",
          },
        };
      },
      showQLayer: async () => {
        events.push("show");
        return { ok: true as const, value: undefined };
      },
    } satisfies WindowController;

    const result = await startVoiceFlowHold(
      asHoldInput({
        settings: {
          ...defaultSettings,
          voiceFlow: { ...defaultSettings.voiceFlow, audioMode: "duck" },
        },
        audio: createAudioController(events, "audioDucked"),
        window,
        keyboard: createKeyboardController(events),
        shouldContinue: () => true,
        waitAfterCodexFocus: async () => {
          events.push("wait-focus");
        },
      }),
    );

    expect(result.status).toBe("waitingForCodex");
    expect(result.steps.at(-1)).toEqual({
      status: "waitingForCodex",
      message: "Codex or ChatGPT isn't open. Open either app, then hold Ctrl+Win again.",
    });
    expect(events).toEqual(["audio", "focus", "restore", "show"]);
  });

  it("keeps a detected focus failure separate from an unavailable app", async () => {
    const events: string[] = [];
    const window = {
      focusCodex: async () => {
        events.push("focus");
        return {
          ok: true as const,
          value: {
            status: "codexFocusNotConfirmed" as const,
            message: "ChatGPT was detected, but Windows did not allow it to become active.",
          },
        };
      },
      showQLayer: async () => {
        events.push("show");
        return { ok: true as const, value: undefined };
      },
    } satisfies WindowController;

    const result = await startVoiceFlowHold(
      asHoldInput({
        settings: defaultSettings,
        audio: createAudioController(events, "audioDisabled"),
        window,
        keyboard: createKeyboardController(events),
        shouldContinue: () => true,
      }),
    );

    expect(result.status).toBe("codexFocusNotConfirmed");
    expect(result.steps.at(-1)).toEqual({
      status: "codexFocusNotConfirmed",
      message: "ChatGPT was detected, but Windows did not allow it to become active.",
    });
    expect(events).toEqual(["audio", "focus", "show"]);
  });

  it("releases dictation if the hold ends while the key press is completing", async () => {
    const events: string[] = [];
    let continueChecks = 0;
    const window = {
      focusCodex: async () => ({
        ok: true as const,
        value: { status: "codexFocused" as const, message: "Codex focused." },
      }),
      showQLayer: async () => ({ ok: true as const, value: undefined }),
    } satisfies WindowController;

    const result = await startVoiceFlowHold(
      asHoldInput({
        settings: defaultSettings,
        audio: createAudioController(events, "audioDisabled"),
        window,
        keyboard: createKeyboardController(events),
        shouldContinue: () => {
          continueChecks += 1;
          return continueChecks === 1;
        },
        waitAfterCodexFocus: async () => undefined,
      }),
    );

    expect(result.status).toBe("ready");
    expect(events).toEqual(["audio", "press", "release", "restore"]);
    expect(result.steps.some((step) => step.status === "dictationStopped")).toBe(true);
  });
});
