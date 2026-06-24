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
        value: { status: "audioDisabled", message: "Audio changes are disabled." },
      };
    }

    const label = mode === "duck" ? "Audio ducking" : "Audio muting";
    return notImplemented(`${label} is planned for a later Windows-native pass.`);
  },
  restoreAudio: () => ({
    ok: true,
    value: {
      status: "restored",
      message: "No audio changes were made by QoLayer in v0.1.",
    },
  }),
};

export const keyboardController: KeyboardController = {
  triggerDictationShortcut: () =>
    notImplemented("Keyboard automation is planned for a later Windows-native pass."),
};

export const codexController: CodexController = {
  openCodex: () => openCodexAction("home"),
  openSettings: () => openCodexAction("settings"),
  openNewThread: () => openCodexAction("newThread"),
};
