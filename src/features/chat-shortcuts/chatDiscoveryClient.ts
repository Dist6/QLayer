import { invoke } from "@tauri-apps/api/core";

import { failed, type AppResult } from "../../shared/result";
import { parseCodexThreadInput } from "../codex/deepLinks";

export type RecentChat = {
  threadId: string;
  title: string;
  projectName?: string;
  updatedAt?: string;
};

export async function listRecentChats(): Promise<AppResult<RecentChat[]>> {
  try {
    return parseRecentChats(await invoke<unknown>("list_recent_codex_chats"));
  } catch {
    return failed("Recent chats are unavailable.");
  }
}

export function parseRecentChats(value: unknown): AppResult<RecentChat[]> {
  if (!Array.isArray(value)) {
    return failed("Recent chats are unavailable.");
  }

  const chats = value.map(parseRecentChat).filter(isRecentChat);
  return { ok: true, value: chats.slice(0, 20) };
}

function parseRecentChat(value: unknown): RecentChat | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  const thread =
    typeof record.threadId === "string" ? parseCodexThreadInput(record.threadId) : null;
  if (!thread?.ok || typeof record.title !== "string" || !record.title.trim()) {
    return null;
  }

  return {
    threadId: thread.threadId,
    title: record.title.trim().slice(0, 80),
    ...(typeof record.projectName === "string" && record.projectName.trim()
      ? { projectName: record.projectName.trim().slice(0, 80) }
      : {}),
    ...(typeof record.updatedAt === "string" ? { updatedAt: record.updatedAt } : {}),
  };
}

function isRecentChat(value: RecentChat | null): value is RecentChat {
  return value !== null;
}
