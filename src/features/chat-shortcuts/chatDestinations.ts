import type { ChatDestination, ChatDestinationCandidate } from "./chatDestinationTypes";
import {
  MAX_CHAT_DESTINATIONS,
  normalizeDestinations,
  normalizeName,
} from "./chatDestinationValidation";

export function pinDestination(
  current: readonly ChatDestination[],
  candidate: ChatDestinationCandidate,
): ChatDestination[] {
  if (current.some((destination) => destination.threadId === candidate.threadId)) {
    return normalizeDestinations(current);
  }
  if (current.length >= MAX_CHAT_DESTINATIONS) {
    return normalizeDestinations(current);
  }

  const pinnedAt = candidate.pinnedAt ?? new Date().toISOString();
  return normalizeDestinations([
    ...current,
    {
      ...candidate,
      id: candidate.id ?? candidate.threadId,
      displayName: normalizeName(candidate.displayName),
      order: current.length + 1,
      pinnedAt,
    },
  ]);
}

export function removeDestination(
  current: readonly ChatDestination[],
  id: string,
): ChatDestination[] {
  return normalizeDestinations(current.filter((destination) => destination.id !== id));
}

export function renameDestination(
  current: readonly ChatDestination[],
  id: string,
  name: string,
): ChatDestination[] {
  const displayName = normalizeName(name);
  if (!displayName) {
    return normalizeDestinations(current);
  }
  return normalizeDestinations(
    current.map((destination) =>
      destination.id === id ? { ...destination, displayName } : destination,
    ),
  );
}

export function moveDestination(
  current: readonly ChatDestination[],
  id: string,
  direction: "up" | "down",
): ChatDestination[] {
  const normalized = normalizeDestinations(current);
  const index = normalized.findIndex((destination) => destination.id === id);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= normalized.length) {
    return normalized;
  }

  const reordered = [...normalized];
  [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
  return reordered.map((destination, order) => ({ ...destination, order: order + 1 }));
}
