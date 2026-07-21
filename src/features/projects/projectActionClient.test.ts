import { describe, expect, it } from "vitest";

import { parseProjectActionDispatch } from "./projectActionClient";

describe("Project action client", () => {
  it("parses completed and safe fallback results", () => {
    expect(parseProjectActionDispatch({ status: "completed" })).toEqual({ status: "completed" });
    expect(
      parseProjectActionDispatch({ status: "fallbackRequired", message: "Fixed message" }),
    ).toEqual({ status: "fallbackRequired", message: "Fixed message" });
    expect(
      parseProjectActionDispatch({ status: "acceptedButFailed", message: "Approval required" }),
    ).toEqual({ status: "acceptedButFailed", message: "Approval required" });
  });

  it("rejects malformed action responses", () => {
    expect(() => parseProjectActionDispatch({ status: "fallbackRequired" })).toThrow();
    expect(() => parseProjectActionDispatch({ status: "unknown" })).toThrow();
    expect(() => parseProjectActionDispatch(null)).toThrow();
  });
});
