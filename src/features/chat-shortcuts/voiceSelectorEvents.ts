import type { ChatDestination } from "./chatDestinationTypes";
import { parseCodexThreadInput } from "../codex/deepLinks";

export const VOICE_SELECTOR_OPEN_EVENT = "qolayer://voice-selector-open";
export const VOICE_SELECTOR_CLOSED_EVENT = "qolayer://voice-selector-closed";
export const VOICE_SELECTOR_READY_EVENT = "qolayer://voice-selector-ready";
export const VOICE_SELECTOR_SELECTION_EVENT = "qolayer://voice-selector-selection";

export type VoiceSelectorOpenPayload = {
  destinations: ChatDestination[];
  projects: VoiceSelectorProject[];
};

export type VoiceSelectorProject = {
  id: string;
  name: string;
  chats: { threadId: string; displayName: string }[];
};

export type VoiceSelectorSelection =
  | { kind: "current" }
  | { kind: "saved"; destinationId: string }
  | { kind: "projectChat"; threadId: string };

export type VoiceSelectorKeyAction = VoiceSelectorSelection | { kind: "cancel" } | null;

export function parseVoiceSelectorOpenPayload(value: unknown): VoiceSelectorOpenPayload | null {
  if (!isRecord(value) || !Array.isArray(value.destinations) || !Array.isArray(value.projects)) {
    return null;
  }
  const destinations = value.destinations.filter(isSelectorDestination);
  const projects = value.projects.filter(isSelectorProject);
  if (
    destinations.length !== value.destinations.length ||
    destinations.length > 9 ||
    projects.length !== value.projects.length ||
    projects.length > 100
  ) {
    return null;
  }
  const orders = new Set(destinations.map((destination) => destination.order));
  if (orders.size !== destinations.length) {
    return null;
  }
  return {
    destinations: [...destinations].sort((left, right) => left.order - right.order),
    projects,
  };
}

export function parseVoiceSelectorSelection(value: unknown): VoiceSelectorSelection | null {
  if (!isRecord(value)) {
    return null;
  }
  if (value.kind === "current") {
    return { kind: "current" };
  }
  if (value.kind === "saved" && typeof value.destinationId === "string" && value.destinationId) {
    return { kind: "saved", destinationId: value.destinationId };
  }
  if (value.kind === "projectChat" && typeof value.threadId === "string") {
    const parsed = parseCodexThreadInput(value.threadId);
    return parsed.ok ? { kind: "projectChat", threadId: parsed.threadId } : null;
  }
  return null;
}

export function getVoiceSelectorKeyAction(
  code: string,
  destinations: readonly ChatDestination[],
): VoiceSelectorKeyAction {
  if (code === "Escape") {
    return { kind: "cancel" };
  }
  const match = /^(?:Digit|Numpad)([0-9])$/.exec(code);
  if (!match) {
    return null;
  }
  const number = Number(match[1]);
  if (number === 0) {
    return { kind: "current" };
  }
  const destination = destinations.find((candidate) => candidate.order === number);
  return destination ? { kind: "saved", destinationId: destination.id } : null;
}

export function getVoiceSelectorNumber(code: string): number | null {
  const match = /^(?:Digit|Numpad)([0-9])$/.exec(code);
  return match ? Number(match[1]) : null;
}

function isSelectorDestination(value: unknown): value is ChatDestination {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.id === "string" &&
    typeof value.threadId === "string" &&
    typeof value.displayName === "string" &&
    typeof value.order === "number" &&
    Number.isInteger(value.order) &&
    value.order >= 1 &&
    value.order <= 9 &&
    typeof value.pinnedAt === "string" &&
    (value.projectName === undefined || typeof value.projectName === "string")
  );
}

function isSelectorProject(value: unknown): value is VoiceSelectorProject {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    !value.id ||
    typeof value.name !== "string" ||
    !value.name.trim() ||
    !Array.isArray(value.chats) ||
    value.chats.length > 50
  ) {
    return false;
  }
  return value.chats.every((chat) => {
    if (
      !isRecord(chat) ||
      typeof chat.threadId !== "string" ||
      typeof chat.displayName !== "string" ||
      !chat.displayName.trim()
    ) {
      return false;
    }
    return parseCodexThreadInput(chat.threadId).ok;
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
