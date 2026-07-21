import { invoke } from "@tauri-apps/api/core";

import { parseLocalhostSnapshot, type LocalhostSnapshot } from "./localhostManagerTypes";

export async function listLocalhostServers(): Promise<LocalhostSnapshot> {
  return parseLocalhostSnapshot(await invoke("list_localhost_servers"));
}

export async function openLocalhostServer(serverId: string): Promise<void> {
  if (serverId.trim().length === 0) {
    throw new Error("The local server could not be opened.");
  }
  await invoke("open_localhost_server", { serverId });
}

export async function setLocalhostProjectAlias(serverId: string, name: string): Promise<void> {
  if (serverId.trim().length === 0 || name.trim().length === 0) {
    throw new Error("The project name could not be saved.");
  }
  await invoke("set_localhost_project_alias", { serverId, name: name.trim() });
}

export async function removeLocalhostProjectAlias(serverId: string): Promise<void> {
  if (serverId.trim().length === 0) {
    throw new Error("The project name could not be removed.");
  }
  await invoke("remove_localhost_project_alias", { serverId });
}
