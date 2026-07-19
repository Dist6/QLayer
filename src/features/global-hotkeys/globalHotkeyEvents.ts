export const QOLAYER_GLOBAL_HOTKEY_ACTION_EVENT = "qolayer://global-hotkey-action";
export const QOLAYER_GLOBAL_HOTKEY_STATUS_EVENT = "qolayer://global-hotkey-status";
export const DEFAULT_GLOBAL_HOTKEY_SHORTCUT = "Ctrl+Alt+Space";

export type GlobalHotkeyAction = "startVoiceFlowHold" | "stopVoiceFlowHold";
export type GlobalHotkeyStatusState = "active" | "failed" | "notAvailable";

export type GlobalHotkeyActionPayload = {
  action: GlobalHotkeyAction;
};

export type GlobalHotkeyStatus = {
  state: GlobalHotkeyStatusState;
  shortcut: string;
  message: string;
};

export type GlobalHotkeyActionParseResult =
  | { ok: true; action: GlobalHotkeyAction }
  | { ok: false; message: string };

export function parseGlobalHotkeyActionPayload(payload: unknown): GlobalHotkeyActionParseResult {
  if (!isRecord(payload) || !isGlobalHotkeyAction(payload.action)) {
    return { ok: false, message: "Unsupported global hotkey action payload." };
  }

  return { ok: true, action: payload.action };
}

export function parseGlobalHotkeyStatus(payload: unknown): GlobalHotkeyStatus {
  if (
    !isRecord(payload) ||
    !isGlobalHotkeyStatusState(payload.state) ||
    typeof payload.shortcut !== "string" ||
    typeof payload.message !== "string"
  ) {
    return {
      state: "notAvailable",
      shortcut: DEFAULT_GLOBAL_HOTKEY_SHORTCUT,
      message: "Global hotkey status is unavailable.",
    };
  }

  return {
    state: payload.state,
    shortcut: payload.shortcut,
    message: payload.message,
  };
}

export function getGlobalHotkeyStatusLabel(state: GlobalHotkeyStatusState): string {
  switch (state) {
    case "active":
      return "Active";
    case "failed":
      return "Failed";
    case "notAvailable":
      return "Not available";
  }
}

function isGlobalHotkeyStatusState(value: unknown): value is GlobalHotkeyStatusState {
  return value === "active" || value === "failed" || value === "notAvailable";
}

function isGlobalHotkeyAction(value: unknown): value is GlobalHotkeyAction {
  return value === "startVoiceFlowHold" || value === "stopVoiceFlowHold";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
