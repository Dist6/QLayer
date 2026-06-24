export const QOLAYER_TRAY_ACTION_EVENT = "qolayer://tray-action";

export type TrayAction = "startVoiceFlow" | "restoreAudio";

export type TrayActionPayload = {
  action: TrayAction;
};

export type TrayStatus = {
  available: boolean;
  message: string;
};

export type TrayActionParseResult =
  | { ok: true; action: TrayAction }
  | { ok: false; message: string };

export const trayActionLabels: Record<TrayAction, string> = {
  startVoiceFlow: "Start Voice Flow",
  restoreAudio: "Restore Audio",
};

export function parseTrayActionPayload(payload: unknown): TrayActionParseResult {
  if (!isRecord(payload) || !isTrayAction(payload.action)) {
    return { ok: false, message: "Unsupported tray action payload." };
  }

  return { ok: true, action: payload.action };
}

export function parseTrayStatus(payload: unknown): TrayStatus {
  if (
    !isRecord(payload) ||
    typeof payload.available !== "boolean" ||
    typeof payload.message !== "string"
  ) {
    return { available: false, message: "Tray status is unavailable." };
  }

  return {
    available: payload.available,
    message: payload.message,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isTrayAction(value: unknown): value is TrayAction {
  return value === "startVoiceFlow" || value === "restoreAudio";
}
