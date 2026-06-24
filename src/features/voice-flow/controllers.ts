import type { AppResult } from "../../shared/result";
import type { AudioMode } from "../settings/settingsTypes";

export type VoiceFlowStatus =
  | "ready"
  | "openingCodex"
  | "audioDisabled"
  | "audioDucked"
  | "audioMuted"
  | "dictationUnavailable"
  | "restored"
  | "failed";

export type VoiceFlowStep = {
  status: VoiceFlowStatus;
  message: string;
};

export type AudioController = {
  prepareAudio: (mode: AudioMode) => AppResult<VoiceFlowStep>;
  restoreAudio: () => AppResult<VoiceFlowStep>;
};

export type KeyboardController = {
  triggerDictationShortcut: (shortcut: string) => AppResult<VoiceFlowStep>;
};

export type CodexController = {
  openCodex: () => Promise<AppResult<void>>;
  openSettings: () => Promise<AppResult<void>>;
  openNewThread: () => Promise<AppResult<void>>;
};
