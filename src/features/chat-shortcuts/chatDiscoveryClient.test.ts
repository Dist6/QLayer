import { describe, expect, it } from "vitest";

import { parseRecentChats } from "./chatDiscoveryClient";

describe("recent chat parsing", () => {
  it("accepts strict metadata and drops malformed siblings", () => {
    expect(
      parseRecentChats([
        {
          threadId: "019f72d8-d02e-75d1-9969-d6c5a647c95e",
          title: " Selector ",
          projectName: " QoLayer ",
          updatedAt: "200",
          preview: "ignored",
        },
        { threadId: "bad", title: "Bad" },
      ]),
    ).toEqual({
      ok: true,
      value: [
        {
          threadId: "019f72d8-d02e-75d1-9969-d6c5a647c95e",
          title: "Selector",
          projectName: "QoLayer",
          updatedAt: "200",
        },
      ],
    });
  });

  it("rejects a malformed response", () => {
    expect(parseRecentChats({ data: [] })).toEqual({
      ok: false,
      reason: "failed",
      message: "Recent chats are unavailable.",
    });
  });
});
