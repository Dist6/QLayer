import { invoke, isTauri } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";

import { failed, type AppResult } from "../../shared/result";

export type ProjectRoot = {
  rootPath: string;
  rootIdentity: string;
  displayName: string;
};

export async function chooseProjectFolder(): Promise<AppResult<ProjectRoot | null>> {
  if (!isTauri()) return failed("Project folders are available only in the desktop app.");
  try {
    const selected = await open({
      directory: true,
      multiple: false,
      title: "Choose project folder",
    });
    if (selected === null) return { ok: true, value: null };
    return parseProjectRoot(await invoke<unknown>("identify_project_root", { path: selected }));
  } catch (reason) {
    return failed(readError(reason));
  }
}

export function parseProjectRoot(value: unknown): AppResult<ProjectRoot> {
  if (!isRecord(value)) return failed("The selected Project folder is unavailable.");
  const { rootPath, rootIdentity, displayName } = value;
  if (
    typeof rootPath !== "string" ||
    !rootPath.trim() ||
    typeof rootIdentity !== "string" ||
    !/^project-[0-9a-f]{16}$/.test(rootIdentity) ||
    typeof displayName !== "string" ||
    !displayName.trim()
  ) {
    return failed("The selected Project folder is unavailable.");
  }
  return {
    ok: true,
    value: {
      rootPath: rootPath.trim(),
      rootIdentity,
      displayName: displayName.trim().slice(0, 80),
    },
  };
}

function readError(reason: unknown): string {
  return typeof reason === "string"
    ? reason
    : reason instanceof Error
      ? reason.message
      : "The selected Project folder is unavailable.";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
