import type { AppSettings } from "./settingsTypes";

export const defaultSettings: AppSettings = {
  general: {
    launchAtStartup: false,
  },
  appearance: {
    theme: "dark",
    language: "en",
  },
  codex: {
    enabled: true,
    dictationShortcut: "Ctrl+M",
  },
  voiceFlow: {
    hotkey: "Ctrl+Alt+Space",
    audioMode: "disabled",
    restoreMode: "manual",
    restoreTimeoutSeconds: 15,
  },
};
