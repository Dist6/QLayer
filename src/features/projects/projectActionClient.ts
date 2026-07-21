import { invoke } from "@tauri-apps/api/core";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";

import { buildCodexThreadLink } from "../codex/deepLinks";
import type { Project, ProjectDevelopmentAction } from "./projectTypes";

export type ProjectActionOutcome =
  | { status: "completed"; message: string }
  | { status: "copied"; message: string }
  | { status: "acceptedButFailed"; message: string }
  | { status: "manualFallback"; message: string; fallbackText: string };

type ProjectActionDispatch =
  | { status: "completed" }
  | { status: "acceptedButFailed"; message: string }
  | { status: "fallbackRequired"; message: string };

export async function runProjectAction(
  project: Project,
  action: ProjectDevelopmentAction,
  threadId: string,
): Promise<ProjectActionOutcome> {
  await openSelectedChat(threadId);
  let dispatch: ProjectActionDispatch;
  try {
    dispatch = parseProjectActionDispatch(
      await invoke<unknown>("dispatch_project_action", {
        request: {
          action,
          projectName: project.name,
          rootPath: project.rootPath,
          threadId,
          ports: project.preferredPorts.map(({ label, role, port, strict }) => ({
            label,
            role,
            port,
            strict,
          })),
        },
      }),
    );
  } catch (reason) {
    return {
      status: "acceptedButFailed",
      message: readError(reason, "The Project action could not be sent."),
    };
  }

  if (dispatch.status === "completed") {
    return { status: "completed", message: "Development action completed. Checking ports." };
  }
  if (dispatch.status === "acceptedButFailed") {
    return dispatch;
  }

  try {
    await writeText(dispatch.message);
    await openSelectedChat(threadId);
    return {
      status: "copied",
      message: "Message copied. Paste it in Codex to continue.",
    };
  } catch {
    await openSelectedChat(threadId);
    return {
      status: "manualFallback",
      message: "Copy this message and paste it in the selected Codex chat.",
      fallbackText: dispatch.message,
    };
  }
}

export function parseProjectActionDispatch(value: unknown): ProjectActionDispatch {
  if (!isRecord(value) || typeof value.status !== "string") {
    throw new Error("Codex returned an invalid Project action response.");
  }
  if (value.status === "completed") return { status: "completed" };
  if (
    (value.status === "acceptedButFailed" || value.status === "fallbackRequired") &&
    typeof value.message === "string" &&
    value.message.trim()
  ) {
    return { status: value.status, message: value.message };
  }
  throw new Error("Codex returned an invalid Project action response.");
}

async function openSelectedChat(threadId: string): Promise<void> {
  await invoke("open_codex_url", { url: buildCodexThreadLink(threadId) }).catch(() => undefined);
}

function readError(reason: unknown, fallback: string): string {
  return typeof reason === "string" ? reason : reason instanceof Error ? reason.message : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
