import type { ChatDestination } from "./chatDestinationTypes";

export const VOICE_SELECTOR_OPEN_EVENT = "qolayer://voice-selector-open";
export const VOICE_SELECTOR_SELECTION_EVENT = "qolayer://voice-selector-selection";

export type VoiceSelectorOpenPayload = {
  destinations: ChatDestination[];
};

export type VoiceSelectorSelection = { kind: "current" } | { kind: "saved"; destinationId: string };

export type VoiceSelectorKeyAction = VoiceSelectorSelection | { kind: "cancel" } | null;

export function parseVoiceSelectorOpenPayload(value: unknown): VoiceSelectorOpenPayload | null {
  if (!isRecord(value) || !Array.isArray(value.destinations)) {
    return null;
  }
  const destinations = value.destinations.filter(isSelectorDestination);
  if (destinations.length !== value.destinations.length || destinations.length > 9) {
    return null;
  }
  const orders = new Set(destinations.map((destination) => destination.order));
  if (orders.size !== destinations.length) {
    return null;
  }
  return { destinations: [...destinations].sort((left, right) => left.order - right.order) };
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
