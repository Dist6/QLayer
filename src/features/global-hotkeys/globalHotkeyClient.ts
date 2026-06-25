import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

import {
  DEFAULT_GLOBAL_HOTKEY_SHORTCUT,
  parseGlobalHotkeyActionPayload,
  parseGlobalHotkeyStatus,
  QOLAYER_GLOBAL_HOTKEY_ACTION_EVENT,
  QOLAYER_GLOBAL_HOTKEY_STATUS_EVENT,
  type GlobalHotkeyAction,
  type GlobalHotkeyStatus,
} from "./globalHotkeyEvents";

export async function getGlobalHotkeyStatus(): Promise<GlobalHotkeyStatus> {
  try {
    const status = await invoke("get_global_hotkey_status");
    return parseGlobalHotkeyStatus(status);
  } catch {
    return {
      state: "notAvailable",
      shortcut: DEFAULT_GLOBAL_HOTKEY_SHORTCUT,
      message: "Global hotkeys are available only in the desktop app.",
    };
  }
}

export async function listenForGlobalHotkeyActions(
  onAction: (action: GlobalHotkeyAction) => void,
  onInvalidPayload: (message: string) => void,
): Promise<() => void> {
  return listen(QOLAYER_GLOBAL_HOTKEY_ACTION_EVENT, (event) => {
    const parsed = parseGlobalHotkeyActionPayload(event.payload);

    if (parsed.ok) {
      onAction(parsed.action);
    } else {
      onInvalidPayload(parsed.message);
    }
  });
}

export async function listenForGlobalHotkeyStatus(
  onStatus: (status: GlobalHotkeyStatus) => void,
): Promise<() => void> {
  return listen(QOLAYER_GLOBAL_HOTKEY_STATUS_EVENT, (event) => {
    onStatus(parseGlobalHotkeyStatus(event.payload));
  });
}
