import { defaultSettings } from "./defaultSettings";
import type {
  AppLanguage,
  AppSettings,
  AudioMode,
  CodexDictationShortcut,
  RestoreMode,
  StoredSettingsParseResult,
  Theme,
} from "./settingsTypes";

type ValidationResult = { ok: true; settings: AppSettings } | { ok: false; settings: AppSettings };

const audioModes = new Set<AudioMode>(["disabled", "duck", "mute"]);
const restoreModes = new Set<RestoreMode>(["manual", "afterTimeout"]);
const dictationShortcuts = new Set<CodexDictationShortcut>(["Ctrl+M", "Ctrl+Shift+M"]);
const themes = new Set<Theme>(["dark"]);
const languages = new Set<AppLanguage>(["en"]);

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
  const appearance = readRecord(value.appearance);
  const codex = readRecord(value.codex);
  const voiceFlow = readRecord(value.voiceFlow);

  return {
    general: {
      launchAtStartup: false,
    },
    appearance: {
      theme: readEnum(appearance.theme, themes, defaultSettings.appearance.theme),
      language: readEnum(appearance.language, languages, defaultSettings.appearance.language),
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
      restoreMode: readEnum(
        voiceFlow.restoreMode,
        restoreModes,
        defaultSettings.voiceFlow.restoreMode,
      ),
      restoreTimeoutSeconds: readTimeout(
        voiceFlow.restoreTimeoutSeconds,
        defaultSettings.voiceFlow.restoreTimeoutSeconds,
      ),
    },
  };
}

function isSettingsFullyValid(value: Record<string, unknown>): boolean {
  const general = readRecord(value.general);
  const appearance = readRecord(value.appearance);
  const codex = readRecord(value.codex);
  const voiceFlow = readRecord(value.voiceFlow);

  return (
    general.launchAtStartup === false &&
    themes.has(appearance.theme as Theme) &&
    languages.has(appearance.language as AppLanguage) &&
    typeof codex.enabled === "boolean" &&
    dictationShortcuts.has(codex.dictationShortcut as CodexDictationShortcut) &&
    isNonEmptyString(voiceFlow.hotkey) &&
    audioModes.has(voiceFlow.audioMode as AudioMode) &&
    restoreModes.has(voiceFlow.restoreMode as RestoreMode) &&
    isValidTimeout(voiceFlow.restoreTimeoutSeconds)
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

function readTimeout(value: unknown, fallback: number): number {
  return isValidTimeout(value) ? value : fallback;
}

function isValidTimeout(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 3 && value <= 300;
}
