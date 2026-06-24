import { notImplemented, type AppResult } from "../../shared/result";
import { openCodexAction } from "../codex/codexController";
import type { AudioMode } from "../settings/settingsTypes";
import type {
  AudioController,
  CodexController,
  KeyboardController,
  VoiceFlowStep,
} from "./controllers";

export const audioController: AudioController = {
  prepareAudio: (mode: AudioMode): AppResult<VoiceFlowStep> => {
    if (mode === "disabled") {
      return {
        ok: true,
        value: {
          status: "audioDisabled",
          message: "Audio control is disabled. Planned audio ducking and muting were not used.",
        },
      };
    }

    const label = mode === "duck" ? "Audio ducking" : "Audio muting";
    return notImplemented(`${label} is planned for a later Windows-native pass.`);
  },
  restoreAudio: () => ({
    ok: false,
    reason: "notImplemented",
    message: "Audio restore is planned for a later Windows-native pass.",
  }),
};

export const keyboardController: KeyboardController = {
  triggerDictationShortcut: () =>
    notImplemented("Dictation automation is planned for a later Windows-native pass."),
};

export const codexController: CodexController = {
  openCodex: () => openCodexAction("home"),
  openSettings: () => openCodexAction("settings"),
  openNewThread: () => openCodexAction("newThread"),
};
