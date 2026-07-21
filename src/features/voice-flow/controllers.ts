import type { AppResult } from "../../shared/result";
import type { AudioMode } from "../settings/settingsTypes";

export type VoiceFlowStatus =
  | "ready"
  | "selectingChat"
  | "focusingCodex"
  | "codexFocused"
  | "codexFocusNotConfirmed"
  | "waitingForCodex"
  | "audioDisabled"
  | "audioDucked"
  | "audioMuted"
  | "audioUnavailable"
  | "dictationSent"
  | "dictationStarted"
  | "dictationStopped"
  | "dictationUnavailable"
  | "restored"
  | "nothingToRestore"
  | "failed";

export type VoiceFlowStep = {
  status: VoiceFlowStatus;
  message: string;
};

export type AudioController = {
  prepareAudio: (
    mode: AudioMode,
    listeningVolumePercent: number,
  ) => Promise<AppResult<VoiceFlowStep>>;
  restoreAudio: () => Promise<AppResult<VoiceFlowStep>>;
};

export type KeyboardController = {
  triggerDictationShortcut: (shortcut: string) => Promise<AppResult<VoiceFlowStep>>;
  pressDictationShortcut: (shortcut: string) => Promise<AppResult<VoiceFlowStep>>;
  releaseDictationShortcut: (shortcut: string) => Promise<AppResult<VoiceFlowStep>>;
};

export type WindowController = {
  focusCodex: () => Promise<AppResult<VoiceFlowStep>>;
  focusCodexThread?: (threadId: string) => Promise<AppResult<VoiceFlowStep>>;
  showQLayer: () => Promise<AppResult<void>>;
};
