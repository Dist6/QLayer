export type ShortcutKeyInput = {
  altKey: boolean;
  code: string;
  ctrlKey: boolean;
  key: string;
  metaKey: boolean;
  shiftKey: boolean;
};

export type ShortcutValidationResult =
  | { ok: true; shortcut: string }
  | { ok: false; message: string };

export type ShortcutCaptureResult =
  | { ok: true; shortcut: string }
  | { ok: false; reason: "cancelled" | "incomplete" }
  | { ok: false; reason: "invalid"; message: string };

const modifierCodes = new Set([
  "AltLeft",
  "AltRight",
  "ControlLeft",
  "ControlRight",
  "MetaLeft",
  "MetaRight",
  "ShiftLeft",
  "ShiftRight",
]);

const namedMainKeys = new Map<string, string>([
  ["ArrowDown", "ArrowDown"],
  ["ArrowLeft", "ArrowLeft"],
  ["ArrowRight", "ArrowRight"],
  ["ArrowUp", "ArrowUp"],
  ["Delete", "Delete"],
  ["End", "End"],
  ["Enter", "Enter"],
  ["Home", "Home"],
  ["Insert", "Insert"],
  ["PageDown", "PageDown"],
  ["PageUp", "PageUp"],
  ["Space", "Space"],
  ["Tab", "Tab"],
]);

const keycapLabels: Readonly<Record<string, string>> = {
  ArrowDown: "↓",
  ArrowLeft: "←",
  ArrowRight: "→",
  ArrowUp: "↑",
};

export function captureGlobalHotkey(input: ShortcutKeyInput): ShortcutCaptureResult {
  if (input.code === "Escape") {
    return { ok: false, reason: "cancelled" };
  }

  if (
    modifierCodes.has(input.code) &&
    input.ctrlKey &&
    input.metaKey &&
    !input.altKey &&
    !input.shiftKey
  ) {
    return { ok: true, shortcut: "Ctrl+Win" };
  }

  if (modifierCodes.has(input.code)) {
    return { ok: false, reason: "incomplete" };
  }

  if (input.metaKey) {
    return { ok: false, reason: "invalid", message: "The Windows key is not supported." };
  }

  const mainKey = mainKeyFromCode(input.code);
  if (!mainKey) {
    return { ok: false, reason: "invalid", message: "That key is not supported." };
  }

  const tokens = [
    input.ctrlKey ? "Ctrl" : null,
    input.altKey ? "Alt" : null,
    input.shiftKey ? "Shift" : null,
    mainKey,
  ].filter((token): token is string => token !== null);
  const validation = validateGlobalHotkey(tokens.join("+"));

  return validation.ok ? validation : { ok: false, reason: "invalid", message: validation.message };
}

export function validateGlobalHotkey(value: string): ShortcutValidationResult {
  const rawTokens = value
    .split("+")
    .map((token) => token.trim())
    .filter(Boolean);

  if (
    rawTokens.length === 2 &&
    /^(control|ctrl)$/i.test(rawTokens[0] ?? "") &&
    /^(meta|super|win|windows)$/i.test(rawTokens[1] ?? "")
  ) {
    return { ok: true, shortcut: "Ctrl+Win" };
  }

  if (rawTokens.length < 2) {
    return { ok: false, message: "Use Ctrl or Alt in the shortcut." };
  }

  const mainKey = normalizeMainKey(rawTokens.at(-1) ?? "");
  const modifierTokens = rawTokens.slice(0, -1);
  const hasMeta = modifierTokens.some((token) => /^(meta|super|win|windows)$/i.test(token));
  if (hasMeta) {
    return { ok: false, message: "The Windows key is supported only in Ctrl+Win." };
  }

  const modifiers = new Set(
    modifierTokens.map((token) => {
      if (/^(control|ctrl)$/i.test(token)) return "Ctrl";
      if (/^(option|alt)$/i.test(token)) return "Alt";
      if (/^shift$/i.test(token)) return "Shift";
      return "";
    }),
  );
  if (modifiers.has("") || modifiers.size !== modifierTokens.length) {
    return { ok: false, message: "That shortcut is not supported." };
  }
  if (!modifiers.has("Ctrl") && !modifiers.has("Alt")) {
    return { ok: false, message: "Use Ctrl or Alt in the shortcut." };
  }
  if (!mainKey) {
    return { ok: false, message: "That key is not supported." };
  }
  if (/^[0-9]$/.test(mainKey)) {
    return { ok: false, message: "Number keys are reserved for chat selection." };
  }

  const orderedModifiers = ["Ctrl", "Alt", "Shift"] as const;
  const shortcut = [
    ...orderedModifiers.filter((modifier) => modifiers.has(modifier)),
    mainKey,
  ].join("+");

  if (shortcut === "Ctrl+Shift+D") {
    return { ok: false, message: "This shortcut is reserved for Codex dictation." };
  }
  if (shortcut === "Alt+F4") {
    return { ok: false, message: "This shortcut is reserved by Windows." };
  }
  if (mainKey === "F12") {
    return { ok: false, message: "F12 is reserved by Windows." };
  }

  return { ok: true, shortcut };
}

export function getShortcutKeycaps(shortcut: string): string[] {
  return shortcut.split("+").map((token) => keycapLabels[token] ?? token);
}

function mainKeyFromCode(code: string): string | null {
  if (/^Key[A-Z]$/.test(code)) {
    return code.slice(3);
  }
  if (/^Digit[0-9]$/.test(code)) {
    return code.slice(5);
  }
  if (/^F(?:[1-9]|1[0-2])$/.test(code)) {
    return code;
  }

  return namedMainKeys.get(code) ?? null;
}

function normalizeMainKey(value: string): string | null {
  if (/^[a-z]$/i.test(value)) return value.toUpperCase();
  if (/^[0-9]$/.test(value)) return value;
  if (/^F(?:[1-9]|1[0-2])$/i.test(value)) return value.toUpperCase();

  const named = Array.from(namedMainKeys.values()).find(
    (candidate) => candidate.toLowerCase() === value.toLowerCase(),
  );
  return named ?? null;
}
