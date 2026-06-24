import { describe, expect, it } from "vitest";

import { defaultSettings } from "./defaultSettings";
import { createSettingsStorage } from "./settingsStorage";

describe("settings storage", () => {
  it("loads defaults when browser storage is unavailable", () => {
    const storage = createSettingsStorage(undefined);

    expect(storage.load()).toEqual({ settings: defaultSettings, recovered: false });
  });

  it("saves and loads settings through local storage", () => {
    const localStorage = new MemoryStorage();
    const storage = createSettingsStorage(localStorage);
    const settings = {
      ...defaultSettings,
      voiceFlow: { ...defaultSettings.voiceFlow, audioMode: "mute" as const },
    };

    storage.save(settings);

    expect(storage.load()).toEqual({ settings, recovered: false });
  });

  it("recovers from corrupted stored settings", () => {
    const localStorage = new MemoryStorage();
    localStorage.setItem("qolayer.settings.v0", "{not-json");

    const storage = createSettingsStorage(localStorage);

    expect(storage.load()).toEqual({ settings: defaultSettings, recovered: true });
  });
});

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.values.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}
