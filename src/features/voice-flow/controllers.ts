import type { AppResult } from "../../shared/result";
import type { AudioMode } from "../settings/settingsTypes";

export type VoiceFlowStatus =
  | "ready"
  | "openingCodex"
  | "codexOpened"
  | "codexFocused"
  | "codexFocusNotConfirmed"
  | "audioDisabled"
  | "audioDucked"
  | "audioMuted"
  | "audioUnavailable"
  | "dictationSent"
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

export type WindowController = {
  focusCodex: () => Promise<AppResult<VoiceFlowStep>>;
};

export type CodexController = {
  openCodex: () => Promise<AppResult<void>>;
  openSettings: () => Promise<AppResult<void>>;
  openNewThread: () => Promise<AppResult<void>>;
};
