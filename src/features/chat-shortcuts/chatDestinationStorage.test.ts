import { describe, expect, it } from "vitest";

import { createChatDestinationStorage } from "./chatDestinationStorage";
import type { ChatDestination } from "./chatDestinationTypes";

function destination(index: number): ChatDestination {
  return {
    id: `destination-${index}`,
    threadId: `019f72d8-d02e-75d1-9969-${index.toString(16).padStart(12, "0")}`,
    displayName: `Chat ${index}`,
    order: index,
    pinnedAt: new Date(2026, 0, index).toISOString(),
  };
}

function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => void values.delete(key),
    setItem: (key, value) => void values.set(key, value),
  };
}

describe("chat destination storage", () => {
  it("returns an empty list when storage is empty or malformed", () => {
    const storage = memoryStorage();
    const destinations = createChatDestinationStorage(storage);
    expect(destinations.load()).toEqual([]);
    storage.setItem("qolayer.chat-destinations.v0", "not json");
    expect(destinations.load()).toEqual([]);
  });

  it("round-trips, deduplicates, and caps valid destinations", () => {
    const storage = createChatDestinationStorage(memoryStorage());
    storage.save([
      ...Array.from({ length: 11 }, (_, index) => destination(index + 1)),
      destination(1),
    ]);
    const loaded = storage.load();
    expect(loaded).toHaveLength(9);
    expect(loaded.map((item) => item.order)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(new Set(loaded.map((item) => item.threadId)).size).toBe(9);
  });

  it("discards invalid records independently", () => {
    const backing = memoryStorage();
    backing.setItem(
      "qolayer.chat-destinations.v0",
      JSON.stringify([destination(1), { nope: true }]),
    );
    expect(createChatDestinationStorage(backing).load()).toEqual([{ ...destination(1), order: 1 }]);
  });
});
