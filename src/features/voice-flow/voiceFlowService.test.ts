import { describe, expect, it } from "vitest";

import { defaultSettings } from "../settings/defaultSettings";
import type {
  AudioController,
  CodexController,
  KeyboardController,
  WindowController,
} from "./controllers";
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

const focusedWindow: WindowController = {
  focusCodex: async () => ({
    ok: true,
    value: {
      status: "codexFocused",
      message: "Codex focused.",
    },
  }),
};

const unconfirmedWindow: WindowController = {
  focusCodex: async () => ({
    ok: true,
    value: {
      status: "codexFocusNotConfirmed",
      message: "Codex opened, but focus could not be confirmed.",
    },
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

    const result = await startVoiceFlow({
      settings: defaultSettings,
      audio,
      codex,
      window: focusedWindow,
      keyboard,
    });

    expect(result.status).toBe("ready");
    expect(result.steps.map((step) => step.status)).toEqual([
      "audioDisabled",
      "openingCodex",
      "codexOpened",
      "codexFocused",
      "dictationSent",
      "ready",
    ]);
    expect(result.steps.map((step) => step.message)).toEqual([
      "Audio unchanged.",
      "Opening Codex.",
      "Codex opened.",
      "Codex focused.",
      "Dictation shortcut sent.",
      "Codex opened. Codex focused. Dictation shortcut sent.",
    ]);
  });

  it("continues to dictation when Codex focus cannot be confirmed", async () => {
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
      window: unconfirmedWindow,
      keyboard,
    });

    expect(result.status).toBe("ready");
    expect(result.steps.map((step) => step.status)).toEqual([
      "audioDisabled",
      "openingCodex",
      "codexOpened",
      "codexFocusNotConfirmed",
      "dictationSent",
      "ready",
    ]);
    expect(result.steps.at(-1)?.message).toBe(
      "Codex opened. Codex opened, but focus could not be confirmed. Dictation shortcut sent.",
    );
  });

  it("waits for Codex readiness before focusing and sending dictation", async () => {
    const events: string[] = [];
    const audio: AudioController = {
      prepareAudio: async () => {
        events.push("audio");
        return {
          ok: true,
          value: {
            status: "audioDisabled",
            message: "Audio unchanged.",
          },
        };
      },
      restoreAudio: async () => ({
        ok: true,
        value: { status: "nothingToRestore", message: "Nothing to restore." },
      }),
    };
    const codex: CodexController = {
      openCodex: async () => {
        events.push("open");
        return { ok: true, value: undefined };
      },
      openSettings: async () => ({ ok: true, value: undefined }),
      openNewThread: async () => ({ ok: true, value: undefined }),
    };
    const window: WindowController = {
      focusCodex: async () => {
        events.push("focus");
        return {
          ok: true,
          value: {
            status: "codexFocused",
            message: "Codex focused.",
          },
        };
      },
    };
    const keyboard: KeyboardController = {
      triggerDictationShortcut: async () => {
        events.push("dictation");
        return {
          ok: true,
          value: {
            status: "dictationSent",
            message: "Dictation shortcut sent.",
          },
        };
      },
    };

    await startVoiceFlow({
      settings: defaultSettings,
      audio,
      codex,
      window,
      keyboard,
      waitAfterCodexOpen: async () => {
        events.push("wait-open");
      },
      waitAfterCodexFocus: async () => {
        events.push("wait-focus");
      },
    });

    expect(events).toEqual(["audio", "open", "wait-open", "focus", "wait-focus", "dictation"]);
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
      window: focusedWindow,
      keyboard,
    });

    expect(result.status).toBe("ready");
    expect(result.steps.map((step) => step.message)).toContain("Audio lowered.");
    expect(result.steps.at(-1)?.message).toBe(
      "Audio lowered. Codex opened. Codex focused. Dictation shortcut sent.",
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
      window: focusedWindow,
      keyboard,
    });

    expect(result.status).toBe("ready");
    expect(result.steps.map((step) => step.message)).toContain("Audio muted.");
    expect(result.steps.at(-1)?.message).toBe(
      "Audio muted. Codex opened. Codex focused. Dictation shortcut sent.",
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
      window: focusedWindow,
      keyboard: unavailableKeyboard,
    });

    expect(result.status).toBe("ready");
    expect(result.steps.map((step) => step.status)).toEqual([
      "audioDisabled",
      "openingCodex",
      "codexOpened",
      "codexFocused",
      "dictationUnavailable",
      "ready",
    ]);
    expect(result.steps.at(-1)?.message).toBe(
      "Codex opened. Codex focused. Dictation automation is not available.",
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
      window: focusedWindow,
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

    const result = await startVoiceFlow({
      settings: defaultSettings,
      audio,
      codex,
      window: focusedWindow,
      keyboard,
    });

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
      window: focusedWindow,
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
