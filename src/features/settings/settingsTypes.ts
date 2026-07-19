export type AudioMode = "disabled" | "duck" | "mute";
export type CodexDictationShortcut = "Ctrl+Shift+D";

export type AppSettings = {
  general: {
    launchAtStartup: boolean;
    closeToTray: boolean;
  };
  codex: {
    enabled: boolean;
    dictationShortcut: CodexDictationShortcut;
  };
  voiceFlow: {
    hotkey: string;
    audioMode: AudioMode;
    listeningVolumePercent: number;
  };
};

export type StoredSettingsParseResult = {
  settings: AppSettings;
  recovered: boolean;
};
