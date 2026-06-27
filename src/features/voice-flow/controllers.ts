import type { AppResult } from "../../shared/result";
import type { AudioMode } from "../settings/settingsTypes";

export type VoiceFlowStatus =
  | "ready"
  | "openingCodex"
  | "codexOpened"
  | "audioDisabled"
  | "audioDucked"
  | "audioMuted"
  | "audioUnavailable"
  | "dictationUnavailable"
  | "restored"
  | "nothingToRestore"
  | "failed";

export type VoiceFlowStep = {
  status: VoiceFlowStatus;
  message: string;
};

export type AudioController = {
  prepareAudio: (mode: AudioMode) => Promise<AppResult<VoiceFlowStep>>;
  restoreAudio: () => Promise<AppResult<VoiceFlowStep>>;
};

export type KeyboardController = {
  triggerDictationShortcut: (shortcut: string) => Promise<AppResult<VoiceFlowStep>>;
};

export type CodexController = {
  openCodex: () => Promise<AppResult<void>>;
  openSettings: () => Promise<AppResult<void>>;
  openNewThread: () => Promise<AppResult<void>>;
};
