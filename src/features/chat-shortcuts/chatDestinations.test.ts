import { describe, expect, it } from "vitest";

import {
  moveDestination,
  pinDestination,
  removeDestination,
  renameDestination,
} from "./chatDestinations";
import type { ChatDestination } from "./chatDestinationTypes";

const first: ChatDestination = {
  id: "first",
  threadId: "019f72d8-d02e-75d1-9969-d6c5a647c95e",
  displayName: "First",
  order: 1,
  pinnedAt: "2026-07-18T00:00:00.000Z",
};
const second: ChatDestination = {
  id: "second",
  threadId: "019f72d8-d02e-75d1-9969-d6c5a647c95f",
  displayName: "Second",
  order: 2,
  pinnedAt: "2026-07-18T00:00:01.000Z",
};

describe("chat destinations", () => {
  it("pins idempotently", () => {
    expect(pinDestination([first], first)).toEqual([first]);
  });

  it("renames, removes, and reorders without mutating input", () => {
    const original = [first, second];
    expect(renameDestination(original, "first", "  New   name ")[0].displayName).toBe("New name");
    expect(removeDestination(original, "first")).toEqual([{ ...second, order: 1 }]);
    expect(moveDestination(original, "second", "up").map((item) => item.id)).toEqual([
      "second",
      "first",
    ]);
    expect(original).toEqual([first, second]);
  });
});
