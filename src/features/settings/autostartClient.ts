import { disable, enable, isEnabled } from "@tauri-apps/plugin-autostart";

export async function syncLaunchAtStartup(requested: boolean): Promise<boolean> {
  const current = await isEnabled();

  if (requested !== current) {
    await (requested ? enable() : disable());
  }

  return requested;
}
