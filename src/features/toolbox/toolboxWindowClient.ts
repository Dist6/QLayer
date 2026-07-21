import { invoke, isTauri } from "@tauri-apps/api/core";

export async function hideToolboxWindow(): Promise<void> {
  if (!isTauri()) return;
  await invoke("hide_main_window");
}
