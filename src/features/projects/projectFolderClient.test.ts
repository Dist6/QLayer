import { describe, expect, it } from "vitest";

import { parseProjectRoot } from "./projectFolderClient";

describe("project folder client", () => {
  it("parses a native Project identity", () => {
    expect(
      parseProjectRoot({
        rootPath: "C:\\Projects\\QLayer",
        rootIdentity: "project-0123456789abcdef",
        displayName: "QLayer",
      }),
    ).toEqual({
      ok: true,
      value: {
        rootPath: "C:\\Projects\\QLayer",
        rootIdentity: "project-0123456789abcdef",
        displayName: "QLayer",
      },
    });
  });

  it("rejects malformed native responses", () => {
    expect(parseProjectRoot({ rootPath: "C:\\Projects\\QLayer" })).toEqual({
      ok: false,
      reason: "failed",
      message: "The selected Project folder is unavailable.",
    });
    expect(
      parseProjectRoot({
        rootPath: "C:\\Projects\\QLayer",
        rootIdentity: "not-a-project-id",
        displayName: "QLayer",
      }),
    ).toEqual({
      ok: false,
      reason: "failed",
      message: "The selected Project folder is unavailable.",
    });
  });
});
