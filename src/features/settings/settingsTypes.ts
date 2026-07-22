export type AudioMode = "disabled" | "duck" | "mute";
export type CodexDictationShortcut = "Ctrl+Shift+D";
export type LocalhostAutoRefreshSeconds = 15 | 30 | 60 | null;

export type AppSettings = {
  general: {
    launchAtStartup: boolean;
    closeToTray: boolean;
    keepVisible: boolean;
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
  localhostManager: {
    autoRefreshSeconds: LocalhostAutoRefreshSeconds;
  };
};

export type StoredSettingsParseResult = {
  settings: AppSettings;
  recovered: boolean;
};
