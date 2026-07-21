import type { AppSettings } from "./settingsTypes";

export const defaultSettings: AppSettings = {
  general: {
    launchAtStartup: false,
    closeToTray: true,
  },
  codex: {
    enabled: true,
    dictationShortcut: "Ctrl+Shift+D",
  },
  voiceFlow: {
    hotkey: "Ctrl+Win",
    audioMode: "disabled",
    listeningVolumePercent: 20,
  },
  localhostManager: {
    autoRefreshSeconds: 30,
  },
};
