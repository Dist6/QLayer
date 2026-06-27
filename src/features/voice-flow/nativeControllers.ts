import { invoke } from "@tauri-apps/api/core";

import { failed, notImplemented, type AppResult } from "../../shared/result";
import { openCodexAction } from "../codex/codexController";
import type { AudioMode } from "../settings/settingsTypes";
import type {
  AudioController,
  CodexController,
  KeyboardController,
  VoiceFlowStep,
} from "./controllers";

type NativeAudioStep = {
  status: VoiceFlowStep["status"];
  message: string;
};

export const audioController: AudioController = {
  prepareAudio: async (mode: AudioMode): Promise<AppResult<VoiceFlowStep>> => {
    if (mode === "disabled") {
      return {
        ok: true,
        value: {
          status: "audioDisabled",
          message: "Audio unchanged.",
        },
      };
    }

    return invokeAudioCommand("prepare_audio", { mode });
  },
  restoreAudio: async () => invokeAudioCommand("restore_audio"),
};

export const keyboardController: KeyboardController = {
  triggerDictationShortcut: async () =>
    notImplemented("Dictation automation is not implemented yet."),
};

export const codexController: CodexController = {
  openCodex: () => openCodexAction("home"),
  openSettings: () => openCodexAction("settings"),
  openNewThread: () => openCodexAction("newThread"),
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

function isNativeAudioStep(value: unknown): value is NativeAudioStep {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return isVoiceFlowStatus(record.status) && typeof record.message === "string";
}

function isVoiceFlowStatus(value: unknown): value is VoiceFlowStep["status"] {
  return (
    value === "audioDucked" ||
    value === "audioMuted" ||
    value === "restored" ||
    value === "nothingToRestore" ||
    value === "audioUnavailable" ||
    value === "failed"
  );
}
