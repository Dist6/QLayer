import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

import {
  parseTrayActionPayload,
  parseTrayStatus,
  QOLAYER_TRAY_ACTION_EVENT,
  QOLAYER_TRAY_STATUS_EVENT,
  type TrayAction,
  type TrayStatus,
} from "./trayEvents";

export async function getTrayStatus(): Promise<TrayStatus> {
  try {
    const status = await invoke("get_tray_status");
    return parseTrayStatus(status);
  } catch {
    return { available: false, message: "Tray status is unavailable." };
  }
}

export async function listenForTrayActions(
  onAction: (action: TrayAction) => void,
  onInvalidPayload: (message: string) => void,
): Promise<() => void> {
  return listen(QOLAYER_TRAY_ACTION_EVENT, (event) => {
    const parsed = parseTrayActionPayload(event.payload);

    if (parsed.ok) {
      onAction(parsed.action);
    } else {
      onInvalidPayload(parsed.message);
    }
  });
}

export async function listenForTrayStatus(
  onStatus: (status: TrayStatus) => void,
): Promise<() => void> {
  return listen(QOLAYER_TRAY_STATUS_EVENT, (event) => {
    onStatus(parseTrayStatus(event.payload));
  });
}
