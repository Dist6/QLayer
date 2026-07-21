import { describe, expect, it } from "vitest";

import type { Project } from "./projectTypes";
import { normalizeProjects, parseProject } from "./projectValidation";

const THREAD_ID = "019f72d8-d02e-75d1-9969-d6c5a647c95e";

function project(overrides: Partial<Project> = {}): Project {
  return {
    id: "project-id",
    name: "QLayer",
    rootPath: "C:\\Users\\example\\QLayer",
    rootIdentity: "project-0123456789abcdef",
    linkedChats: [
      { threadId: THREAD_ID, displayName: "Projects", linkedAt: "2026-07-20T00:00:00.000Z" },
    ],
    preferredPorts: [
      { id: "frontend", label: "Frontend", role: "frontend", port: 1420, strict: true },
    ],
    lastSelectedChatId: THREAD_ID,
    createdAt: "2026-07-20T00:00:00.000Z",
    updatedAt: "2026-07-20T01:00:00.000Z",
    ...overrides,
  };
}

describe("project validation", () => {
  it("normalizes a valid project", () => {
    expect(parseProject(project({ name: "  QLayer   Desktop  " }))).toMatchObject({
      name: "QLayer Desktop",
      rootIdentity: "project-0123456789abcdef",
      lastSelectedChatId: THREAD_ID,
    });
  });

  it("rejects malformed roots, chats, ports, and dangling selections", () => {
    expect(parseProject(project({ rootIdentity: "C:\\secret" }))).toBeNull();
    expect(
      parseProject(
        project({
          linkedChats: [{ threadId: "invalid", displayName: "Chat", linkedAt: "2026-07-20" }],
        }),
      ),
    ).toBeNull();
    expect(
      parseProject(
        project({
          preferredPorts: [
            { id: "one", label: "Frontend", role: "frontend", port: 1420, strict: true },
            { id: "two", label: "Backend", role: "backend", port: 1420, strict: true },
          ],
        }),
      ),
    ).toBeNull();
    expect(
      parseProject(
        project({
          preferredPorts: [{ id: "bad", label: "Bad", role: "other", port: 0, strict: false }],
        }),
      ),
    ).toBeNull();
    expect(
      parseProject(project({ lastSelectedChatId: "019f72d8-d02e-75d1-9969-d6c5a647c95f" })),
    ).toBeNull();
  });

  it("deduplicates ids and root identities while preserving valid siblings", () => {
    const newest = project();
    const duplicateId = project({ rootIdentity: "project-1111111111111111" });
    const duplicateRoot = project({ id: "another-id" });
    const other = project({
      id: "other",
      rootIdentity: "project-2222222222222222",
      updatedAt: "2026-07-19T00:00:00.000Z",
    });
    expect(normalizeProjects([newest, duplicateId, duplicateRoot, other])).toEqual([newest, other]);
  });
});
