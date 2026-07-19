import type { ChatDestination } from "./chatDestinationTypes";
import { normalizeDestinations, parseChatDestination } from "./chatDestinationValidation";

export const CHAT_DESTINATION_STORAGE_KEY = "qolayer.chat-destinations.v0";

export type ChatDestinationStorage = {
  load: () => ChatDestination[];
  save: (destinations: readonly ChatDestination[]) => void;
};

export function createChatDestinationStorage(storage: Storage): ChatDestinationStorage {
  return {
    load: () => {
      const raw = storage.getItem(CHAT_DESTINATION_STORAGE_KEY);
      if (!raw) {
        return [];
      }

      try {
        const parsed: unknown = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
          return [];
        }
        return normalizeDestinations(parsed.map(parseChatDestination).filter(isDestination));
      } catch {
        return [];
      }
    },
    save: (destinations) => {
      storage.setItem(CHAT_DESTINATION_STORAGE_KEY, JSON.stringify(normalizeDestinations(destinations)));
    },
  };
}

function isDestination(value: ChatDestination | null): value is ChatDestination {
  return value !== null;
}
