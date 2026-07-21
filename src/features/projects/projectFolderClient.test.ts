import { describe, expect, it } from "vitest";

import { parseProjectRoot } from "./projectFolderClient";

describe("project folder client", () => {
  it("parses a native Project identity", () => {
    expect(
      parseProjectRoot({
        rootPath: "C:\\Projects\\QoLayer",
        rootIdentity: "project-0123456789abcdef",
        displayName: "QoLayer",
      }),
    ).toEqual({
      ok: true,
      value: {
        rootPath: "C:\\Projects\\QoLayer",
        rootIdentity: "project-0123456789abcdef",
        displayName: "QoLayer",
      },
    });
  });

  it("rejects malformed native responses", () => {
    expect(parseProjectRoot({ rootPath: "C:\\Projects\\QoLayer" })).toEqual({
      ok: false,
      reason: "failed",
      message: "The selected Project folder is unavailable.",
    });
    expect(
      parseProjectRoot({
        rootPath: "C:\\Projects\\QoLayer",
        rootIdentity: "not-a-project-id",
        displayName: "QoLayer",
      }),
    ).toEqual({
      ok: false,
      reason: "failed",
      message: "The selected Project folder is unavailable.",
    });
  });
});
