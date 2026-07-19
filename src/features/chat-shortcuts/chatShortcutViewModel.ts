import type { RecentChat } from "./chatDiscoveryClient";
import type { ChatDestination } from "./chatDestinationTypes";

export type DestinationRow = ChatDestination & { number: number };
export type RecentChatRow = RecentChat & { pinned: boolean };

export type ChatShortcutViewModel = {
  destinationRows: DestinationRow[];
  recentRows: RecentChatRow[];
  canPinMore: boolean;
};

export function buildChatShortcutViewModel(
  destinations: readonly ChatDestination[],
  recentChats: readonly RecentChat[],
): ChatShortcutViewModel {
  const ordered = [...destinations].sort((left, right) => left.order - right.order);
  const pinnedIds = new Set(ordered.map((destination) => destination.threadId));

  return {
    destinationRows: ordered.map((destination, index) => ({
      ...destination,
      number: index + 1,
    })),
    recentRows: recentChats.map((chat) => ({
      ...chat,
      pinned: pinnedIds.has(chat.threadId),
    })),
    canPinMore: ordered.length < 9,
  };
}
