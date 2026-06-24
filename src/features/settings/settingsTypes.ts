export type AudioMode = "disabled" | "duck" | "mute";
export type RestoreMode = "manual" | "afterTimeout";
export type Theme = "dark";
export type AppLanguage = "en";

export type AppSettings = {
  general: {
    launchAtStartup: false;
  };
  appearance: {
    theme: Theme;
    language: AppLanguage;
  };
  codex: {
    enabled: boolean;
    dictationShortcut: string;
  };
  voiceFlow: {
    hotkey: string;
    audioMode: AudioMode;
    restoreMode: RestoreMode;
    restoreTimeoutSeconds: number;
  };
};

export type StoredSettingsParseResult = {
  settings: AppSettings;
  recovered: boolean;
};
