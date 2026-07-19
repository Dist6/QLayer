import { invoke } from "@tauri-apps/api/core";

import { failed, notImplemented, type AppResult } from "../../shared/result";
import type { AudioMode } from "../settings/settingsTypes";
import type {
  AudioController,
  KeyboardController,
  VoiceFlowStep,
  WindowController,
} from "./controllers";

type NativeVoiceFlowStep = {
  status: VoiceFlowStep["status"];
  message: string;
};

export const audioController: AudioController = {
  prepareAudio: async (
    mode: AudioMode,
    listeningVolumePercent: number,
  ): Promise<AppResult<VoiceFlowStep>> => {
    if (mode === "disabled") {
      return {
        ok: true,
        value: {
          status: "audioDisabled",
          message: "Audio unchanged.",
        },
      };
    }

    return invokeAudioCommand("prepare_audio", { mode, listeningVolumePercent });
  },
  restoreAudio: async () => invokeAudioCommand("restore_audio"),
};

export const keyboardController: KeyboardController = {
  triggerDictationShortcut: async (shortcut: string) =>
    invokeKeyboardCommand("send_dictation_shortcut", { shortcut }),
  pressDictationShortcut: async (shortcut: string) =>
    invokeKeyboardCommand("press_dictation_shortcut", { shortcut }),
  releaseDictationShortcut: async (shortcut: string) =>
    invokeKeyboardCommand("release_dictation_shortcut", { shortcut }),
};

export const windowController: WindowController = {
  focusCodex: async () => invokeWindowCommand(),
  showQoLayer: async () => invokeShowMainWindow(),
};

async function invokeAudioCommand(
  command: "prepare_audio" | "restore_audio",
  args?: Record<string, unknown>,
): Promise<AppResult<VoiceFlowStep>> {
  try {
    const step = await invoke<unknown>(command, args);
    return parseNativeAudioStep(step);
  } catch (error) {
    const message = typeof error === "string" ? error : "Audio control is not available.";

    if (message === "Audio control is not available.") {
      return notImplemented(message);
    }

    return failed(message);
  }
}

function parseNativeAudioStep(value: unknown): AppResult<VoiceFlowStep> {
  if (!isNativeAudioStep(value)) {
    return failed("Audio control failed.");
  }

  return { ok: true, value };
}

async function invokeKeyboardCommand(
  command: "send_dictation_shortcut" | "press_dictation_shortcut" | "release_dictation_shortcut",
  args: {
    shortcut: string;
  },
): Promise<AppResult<VoiceFlowStep>> {
  try {
    const step = await invoke<unknown>(command, args);
    return parseNativeKeyboardStep(step);
  } catch (error) {
    const message = typeof error === "string" ? error : "Dictation automation is not available.";

    if (message === "Dictation automation is not available.") {
      return notImplemented(message);
    }

    return failed("Dictation shortcut could not be sent.");
  }
}

export function parseNativeKeyboardStep(value: unknown): AppResult<VoiceFlowStep> {
  if (!isNativeKeyboardStep(value)) {
    return failed("Dictation shortcut could not be sent.");
  }

  return { ok: true, value };
}

async function invokeWindowCommand(): Promise<AppResult<VoiceFlowStep>> {
  try {
    const step = await invoke<unknown>("focus_codex_window");
    return parseNativeWindowStep(step);
  } catch {
    return notImplemented("Codex could not be focused.");
  }
}

async function invokeShowMainWindow(): Promise<AppResult<void>> {
  try {
    await invoke("show_main_window");
    return { ok: true, value: undefined };
  } catch (error) {
    return failed(typeof error === "string" ? error : "QoLayer window could not be shown.");
  }
}

export function parseNativeWindowStep(value: unknown): AppResult<VoiceFlowStep> {
  if (!isNativeWindowStep(value)) {
    return failed("Codex could not be focused.");
  }

  return { ok: true, value };
}

function isNativeAudioStep(value: unknown): value is NativeVoiceFlowStep {
  return isNativeVoiceFlowStep(value) && isAudioStatus(value.status);
}

function isNativeKeyboardStep(value: unknown): value is NativeVoiceFlowStep {
  return (
    isNativeVoiceFlowStep(value) &&
    (value.status === "dictationSent" ||
      value.status === "dictationStarted" ||
      value.status === "dictationStopped")
  );
}

function isNativeWindowStep(value: unknown): value is NativeVoiceFlowStep {
  return (
    isNativeVoiceFlowStep(value) &&
    (value.status === "codexFocused" || value.status === "codexFocusNotConfirmed")
  );
}

function isNativeVoiceFlowStep(value: unknown): value is NativeVoiceFlowStep {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return isVoiceFlowStatus(record.status) && typeof record.message === "string";
}

function isVoiceFlowStatus(value: unknown): value is VoiceFlowStep["status"] {
  return (
    value === "audioDisabled" ||
    value === "audioDucked" ||
    value === "audioMuted" ||
    value === "codexFocused" ||
    value === "codexFocusNotConfirmed" ||
    value === "waitingForCodex" ||
    value === "restored" ||
    value === "nothingToRestore" ||
    value === "audioUnavailable" ||
    value === "dictationSent" ||
    value === "dictationStarted" ||
    value === "dictationStopped" ||
    value === "failed"
  );
}

function isAudioStatus(value: VoiceFlowStep["status"]): boolean {
  return (
    value === "audioDisabled" ||
    value === "audioDucked" ||
    value === "audioMuted" ||
    value === "restored" ||
    value === "nothingToRestore" ||
    value === "audioUnavailable" ||
    value === "failed"
  );
}
