import { useCallback, useMemo, useState } from "react";

import { listRecentChats, type RecentChat } from "./chatDiscoveryClient";
import { createChatDestinationStorage } from "./chatDestinationStorage";
import type { ChatDestination, ChatDestinationCandidate } from "./chatDestinationTypes";
import {
  moveDestination,
  pinDestination,
  removeDestination,
  renameDestination,
} from "./chatDestinations";

export type ChatDestinationsState = {
  destinations: ChatDestination[];
  recentChats: RecentChat[];
  discoveryAttempted: boolean;
  discoveryLoading: boolean;
  discoveryMessage?: string;
  pin: (candidate: ChatDestinationCandidate) => void;
  remove: (id: string) => void;
  rename: (id: string, name: string) => void;
  move: (id: string, direction: "up" | "down") => void;
  refreshRecent: () => Promise<void>;
};

export function useChatDestinations(): ChatDestinationsState {
  const storage = useMemo(() => createChatDestinationStorage(window.localStorage), []);
  const [destinations, setDestinations] = useState<ChatDestination[]>(() => storage.load());
  const [recentChats, setRecentChats] = useState<RecentChat[]>([]);
  const [discoveryAttempted, setDiscoveryAttempted] = useState(false);
  const [discoveryLoading, setDiscoveryLoading] = useState(false);
  const [discoveryMessage, setDiscoveryMessage] = useState<string>();

  const update = useCallback(
    (operation: (current: readonly ChatDestination[]) => ChatDestination[]) => {
      setDestinations((current) => {
        const next = operation(current);
        storage.save(next);
        return next;
      });
    },
    [storage],
  );

  const pin = useCallback(
    (candidate: ChatDestinationCandidate) =>
      update((current) => pinDestination(current, candidate)),
    [update],
  );
  const remove = useCallback(
    (id: string) => update((current) => removeDestination(current, id)),
    [update],
  );
  const rename = useCallback(
    (id: string, name: string) => update((current) => renameDestination(current, id, name)),
    [update],
  );
  const move = useCallback(
    (id: string, direction: "up" | "down") =>
      update((current) => moveDestination(current, id, direction)),
    [update],
  );

  const refreshRecent = useCallback(async () => {
    setDiscoveryAttempted(true);
    setDiscoveryLoading(true);
    setDiscoveryMessage(undefined);
    const result = await listRecentChats();
    if (result.ok) {
      setRecentChats(result.value);
    } else {
      setRecentChats([]);
      setDiscoveryMessage("Recent chats unavailable. Add a chat manually.");
    }
    setDiscoveryLoading(false);
  }, []);

  return {
    destinations,
    recentChats,
    discoveryAttempted,
    discoveryLoading,
    ...(discoveryMessage ? { discoveryMessage } : {}),
    pin,
    remove,
    rename,
    move,
    refreshRecent,
  };
}
