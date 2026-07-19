import { describe, expect, it } from "vitest";

import type { RecentChat } from "./chatDiscoveryClient";
import type { ChatDestination } from "./chatDestinationTypes";
import { buildChatShortcutViewModel } from "./chatShortcutViewModel";

const destination: ChatDestination = {
  id: "saved",
  threadId: "019f72d8-d02e-75d1-9969-d6c5a647c95e",
  displayName: "Saved chat",
  order: 3,
  pinnedAt: "2026-07-18T00:00:00.000Z",
};
const recent: RecentChat = {
  threadId: destination.threadId,
  title: "Recent chat",
};

describe("chat shortcut view model", () => {
  it("numbers normalized destinations and marks recent duplicates", () => {
    const model = buildChatShortcutViewModel([destination], [recent]);
    expect(model.destinationRows[0].number).toBe(1);
    expect(model.recentRows[0].pinned).toBe(true);
    expect(model.canPinMore).toBe(true);
  });

  it("enforces the nine-destination presentation limit", () => {
    const destinations = Array.from({ length: 9 }, (_, index) => ({
      ...destination,
      id: `saved-${index}`,
      threadId: `019f72d8-d02e-75d1-9969-${index.toString(16).padStart(12, "0")}`,
      order: index + 1,
    }));
    expect(buildChatShortcutViewModel(destinations, []).canPinMore).toBe(false);
  });
});
