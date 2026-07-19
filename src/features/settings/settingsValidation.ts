import { defaultSettings } from "./defaultSettings";
import type {
  AppSettings,
  AudioMode,
  CodexDictationShortcut,
  StoredSettingsParseResult,
} from "./settingsTypes";

type ValidationResult = { ok: true; settings: AppSettings } | { ok: false; settings: AppSettings };

const audioModes = new Set<AudioMode>(["disabled", "duck", "mute"]);
const dictationShortcuts = new Set<CodexDictationShortcut>(["Ctrl+Shift+D"]);
export const listeningVolumeBounds = { min: 5, max: 50 } as const;

export function validateSettings(value: unknown): ValidationResult {
  if (!isRecord(value)) {
    return { ok: false, settings: defaultSettings };
  }

  const settings = mergeSettings(value);
  const valid = isSettingsFullyValid(value);

  return { ok: valid, settings };
}

export function parseStoredSettings(raw: string | null): StoredSettingsParseResult {
  if (!raw) {
    return { settings: defaultSettings, recovered: false };
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    const result = validateSettings(parsed);

    return { settings: result.settings, recovered: !result.ok };
  } catch {
    return { settings: defaultSettings, recovered: true };
  }
}

function mergeSettings(value: Record<string, unknown>): AppSettings {
  const general = readRecord(value.general);
  const codex = readRecord(value.codex);
  const voiceFlow = readRecord(value.voiceFlow);

  return {
    general: {
      launchAtStartup: readBoolean(
        general.launchAtStartup,
        defaultSettings.general.launchAtStartup,
      ),
      closeToTray: readBoolean(general.closeToTray, defaultSettings.general.closeToTray),
    },
    codex: {
      enabled: readBoolean(codex.enabled, defaultSettings.codex.enabled),
      dictationShortcut: readEnum(
        codex.dictationShortcut,
        dictationShortcuts,
        defaultSettings.codex.dictationShortcut,
      ),
    },
    voiceFlow: {
      hotkey: readNonEmptyString(voiceFlow.hotkey, defaultSettings.voiceFlow.hotkey),
      audioMode: readEnum(voiceFlow.audioMode, audioModes, defaultSettings.voiceFlow.audioMode),
      listeningVolumePercent: readListeningVolume(
        voiceFlow.listeningVolumePercent,
        defaultSettings.voiceFlow.listeningVolumePercent,
      ),
    },
  };
}

function isSettingsFullyValid(value: Record<string, unknown>): boolean {
  const general = readRecord(value.general);
  const codex = readRecord(value.codex);
  const voiceFlow = readRecord(value.voiceFlow);

  return (
    typeof general.launchAtStartup === "boolean" &&
    typeof general.closeToTray === "boolean" &&
    typeof codex.enabled === "boolean" &&
    dictationShortcuts.has(codex.dictationShortcut as CodexDictationShortcut) &&
    isNonEmptyString(voiceFlow.hotkey) &&
    audioModes.has(voiceFlow.audioMode as AudioMode) &&
    isValidListeningVolume(voiceFlow.listeningVolumePercent)
  );
}

function readRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function readNonEmptyString(value: unknown, fallback: string): string {
  return isNonEmptyString(value) ? value : fallback;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function readEnum<T extends string>(value: unknown, allowed: Set<T>, fallback: T): T {
  return typeof value === "string" && allowed.has(value as T) ? (value as T) : fallback;
}

function readListeningVolume(value: unknown, fallback: number): number {
  return isValidListeningVolume(value) ? value : fallback;
}

function isValidListeningVolume(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= listeningVolumeBounds.min &&
    value <= listeningVolumeBounds.max
  );
}
