import { defaultSettings } from "./defaultSettings";
import { parseStoredSettings } from "./settingsValidation";
import type { AppSettings, StoredSettingsParseResult } from "./settingsTypes";

const storageKey = "qolayer.settings.v0";

export type SettingsStorage = {
  load: () => StoredSettingsParseResult;
  save: (settings: AppSettings) => void;
};

export function createSettingsStorage(storage: Storage | undefined): SettingsStorage {
  return {
    load: () => {
      if (!storage) {
        return { settings: defaultSettings, recovered: false };
      }

      return parseStoredSettings(storage.getItem(storageKey));
    },
    save: (settings) => {
      storage?.setItem(storageKey, JSON.stringify(settings));
    },
  };
}
