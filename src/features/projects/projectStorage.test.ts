import { describe, expect, it } from "vitest";

import { createProject, deleteProject, updateProject } from "./projectOperations";
import { createProjectStorage, PROJECT_STORAGE_KEY } from "./projectStorage";
import type { ProjectCandidate } from "./projectTypes";

const THREAD_ID = "019f72d8-d02e-75d1-9969-d6c5a647c95e";

function candidate(): ProjectCandidate {
  return {
    name: "QoLayer",
    rootPath: "C:\\Projects\\QoLayer",
    rootIdentity: "project-0123456789abcdef",
    linkedChats: [
      {
        threadId: THREAD_ID,
        displayName: "Projects",
        linkedAt: "2026-07-20T00:00:00.000Z",
      },
    ],
    preferredPorts: [{ id: "web", label: "Web", role: "frontend", port: 1420, strict: true }],
    lastSelectedChatId: THREAD_ID,
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

describe("project storage and operations", () => {
  it("round-trips a versioned envelope", () => {
    const backing = memoryStorage();
    const storage = createProjectStorage(backing);
    const projects = createProject([], candidate(), "2026-07-20T00:00:00.000Z", "one");
    storage.save(projects);
    expect(JSON.parse(backing.getItem(PROJECT_STORAGE_KEY) ?? "null")).toMatchObject({
      version: 0,
    });
    expect(storage.load()).toEqual({ projects });
  });

  it("keeps valid siblings and warns about invalid saved entries", () => {
    const backing = memoryStorage();
    const valid = createProject([], candidate(), "2026-07-20T00:00:00.000Z", "one")[0];
    backing.setItem(
      PROJECT_STORAGE_KEY,
      JSON.stringify({ version: 0, projects: [valid, { nope: true }] }),
    );
    expect(createProjectStorage(backing).load()).toEqual({
      projects: [valid],
      warning: "Some saved Projects could not be loaded.",
    });
  });

  it("creates, updates, and deletes without mutating unrelated Projects", () => {
    const created = createProject([], candidate(), "2026-07-20T00:00:00.000Z", "one");
    const updated = updateProject(
      created,
      "one",
      { ...candidate(), name: "QoLayer Desktop" },
      "2026-07-20T01:00:00.000Z",
    );
    expect(updated[0]).toMatchObject({
      id: "one",
      name: "QoLayer Desktop",
      createdAt: "2026-07-20T00:00:00.000Z",
    });
    expect(deleteProject(updated, "one")).toEqual([]);
  });

  it("returns a recoverable warning for malformed envelopes", () => {
    const backing = memoryStorage();
    backing.setItem(PROJECT_STORAGE_KEY, "not-json");
    expect(createProjectStorage(backing).load()).toEqual({
      projects: [],
      warning: "Saved Projects could not be loaded.",
    });
  });
});
