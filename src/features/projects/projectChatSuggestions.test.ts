import { describe, expect, it } from "vitest";

import { suggestProjectChats } from "./projectChatSuggestions";

const MATCHING = "019f72d8-d02e-75d1-9969-d6c5a647c95e";
const SAVED = "019f72d8-d02e-75d1-9969-d6c5a647c95f";
const LINKED = "019f72d8-d02e-75d1-9969-d6c5a647c960";

describe("Project chat suggestions", () => {
  it("ranks reliable folder matches and excludes linked chats", () => {
    const suggestions = suggestProjectChats(
      {
        rootIdentity: "project-0123456789abcdef",
        linkedChats: [{ threadId: LINKED, displayName: "Linked", linkedAt: "2026-07-20" }],
      },
      [{ id: SAVED, threadId: SAVED, displayName: "Saved", order: 1, pinnedAt: "2026-07-20" }],
      [
        {
          threadId: MATCHING,
          title: "Matching recent",
          projectId: "project-0123456789abcdef",
          projectName: "QLayer",
          updatedAt: "200",
        },
        { threadId: LINKED, title: "Already linked", updatedAt: "300" },
      ],
    );

    expect(suggestions.map((chat) => chat.threadId)).toEqual([MATCHING, SAVED]);
    expect(suggestions[0]).toMatchObject({ matchesProject: true, projectName: "QLayer" });
  });

  it("deduplicates saved and recent metadata by thread ID", () => {
    expect(
      suggestProjectChats(
        { rootIdentity: "project-0123456789abcdef", linkedChats: [] },
        [
          {
            id: SAVED,
            threadId: SAVED,
            displayName: "Saved name",
            order: 1,
            pinnedAt: "2026-07-20",
          },
        ],
        [{ threadId: SAVED, title: "Recent title", projectId: "project-0123456789abcdef" }],
      ),
    ).toEqual([
      {
        threadId: SAVED,
        displayName: "Saved name",
        source: "saved",
        matchesProject: true,
      },
    ]);
  });
});
