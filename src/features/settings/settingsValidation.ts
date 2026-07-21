import { defaultSettings } from "./defaultSettings";
import { validateGlobalHotkey } from "../global-hotkeys/globalHotkeyShortcut";
import type {
  AppSettings,
  AudioMode,
  CodexDictationShortcut,
  LocalhostAutoRefreshSeconds,
  StoredSettingsParseResult,
} from "./settingsTypes";

type ValidationResult = { ok: true; settings: AppSettings } | { ok: false; settings: AppSettings };

const audioModes = new Set<AudioMode>(["disabled", "duck", "mute"]);
const dictationShortcuts = new Set<CodexDictationShortcut>(["Ctrl+Shift+D"]);
const legacyDefaultGlobalHotkey = "Ctrl+Alt+Space";
const autoRefreshIntervals = new Set<LocalhostAutoRefreshSeconds>([null, 15, 30, 60]);
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
  const localhostManager = readRecord(value.localhostManager);

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
      hotkey: readGlobalHotkey(voiceFlow.hotkey, defaultSettings.voiceFlow.hotkey),
      audioMode: readEnum(voiceFlow.audioMode, audioModes, defaultSettings.voiceFlow.audioMode),
      listeningVolumePercent: readListeningVolume(
        voiceFlow.listeningVolumePercent,
        defaultSettings.voiceFlow.listeningVolumePercent,
      ),
    },
    localhostManager: {
      autoRefreshSeconds: readAutoRefreshInterval(
        localhostManager.autoRefreshSeconds,
        defaultSettings.localhostManager.autoRefreshSeconds,
      ),
    },
  };
}

function isSettingsFullyValid(value: Record<string, unknown>): boolean {
  const general = readRecord(value.general);
  const codex = readRecord(value.codex);
  const voiceFlow = readRecord(value.voiceFlow);
  const localhostManager = readRecord(value.localhostManager);

  return (
    typeof general.launchAtStartup === "boolean" &&
    typeof general.closeToTray === "boolean" &&
    typeof codex.enabled === "boolean" &&
    dictationShortcuts.has(codex.dictationShortcut as CodexDictationShortcut) &&
    isCanonicalGlobalHotkey(voiceFlow.hotkey) &&
    audioModes.has(voiceFlow.audioMode as AudioMode) &&
    isValidListeningVolume(voiceFlow.listeningVolumePercent) &&
    autoRefreshIntervals.has(localhostManager.autoRefreshSeconds as LocalhostAutoRefreshSeconds)
  );
}

function readAutoRefreshInterval(
  value: unknown,
  fallback: LocalhostAutoRefreshSeconds,
): LocalhostAutoRefreshSeconds {
  return autoRefreshIntervals.has(value as LocalhostAutoRefreshSeconds)
    ? (value as LocalhostAutoRefreshSeconds)
    : fallback;
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

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function readGlobalHotkey(value: unknown, fallback: string): string {
  if (!isNonEmptyString(value)) return fallback;
  if (value === legacyDefaultGlobalHotkey) return fallback;

  const validation = validateGlobalHotkey(value);
  return validation.ok ? validation.shortcut : fallback;
}

function isCanonicalGlobalHotkey(value: unknown): value is string {
  if (!isNonEmptyString(value)) return false;

  const validation = validateGlobalHotkey(value);
  return validation.ok && validation.shortcut === value;
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
