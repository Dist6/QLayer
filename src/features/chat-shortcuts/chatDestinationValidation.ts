import { parseCodexThreadInput } from "../codex/deepLinks";
import type { ChatDestination } from "./chatDestinationTypes";

export const MAX_CHAT_DESTINATIONS = 9;
export const MAX_DESTINATION_NAME_LENGTH = 60;

export function parseChatDestination(value: unknown): ChatDestination | null {
  if (!isRecord(value)) {
    return null;
  }

  const thread = typeof value.threadId === "string" ? parseCodexThreadInput(value.threadId) : null;
  const displayName = typeof value.displayName === "string" ? normalizeName(value.displayName) : "";
  const projectName = typeof value.projectName === "string" ? normalizeName(value.projectName) : "";

  if (
    !thread?.ok ||
    !displayName ||
    typeof value.id !== "string" ||
    !value.id.trim() ||
    typeof value.order !== "number" ||
    !Number.isInteger(value.order) ||
    typeof value.pinnedAt !== "string" ||
    !isIsoDate(value.pinnedAt)
  ) {
    return null;
  }

  return {
    id: value.id.trim(),
    threadId: thread.threadId,
    displayName,
    ...(projectName ? { projectName } : {}),
    order: value.order,
    pinnedAt: value.pinnedAt,
  };
}

export function normalizeDestinations(values: readonly ChatDestination[]): ChatDestination[] {
  const unique = new Map<string, ChatDestination>();
  [...values]
    .sort((left, right) => left.order - right.order || left.pinnedAt.localeCompare(right.pinnedAt))
    .forEach((destination) => {
      if (!unique.has(destination.threadId)) {
        unique.set(destination.threadId, destination);
      }
    });

  return [...unique.values()].slice(0, MAX_CHAT_DESTINATIONS).map((destination, index) => ({
    ...destination,
    order: index + 1,
  }));
}

export function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, " ").slice(0, MAX_DESTINATION_NAME_LENGTH);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isIsoDate(value: string): boolean {
  return !Number.isNaN(Date.parse(value));
}
