import { invoke } from "@tauri-apps/api/core";

export async function setCloseToTray(enabled: boolean): Promise<void> {
  await invoke("set_close_to_tray", { enabled });
}

export async function setKeepVisible(enabled: boolean): Promise<void> {
  await invoke("set_keep_visible", { enabled });
}
