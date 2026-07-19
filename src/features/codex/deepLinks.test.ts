import { describe, expect, it } from "vitest";

import {
  buildCodexHomeLink,
  buildCodexNewThreadLink,
  buildCodexSettingsLink,
  buildCodexThreadLink,
  isAllowedCodexLink,
  parseCodexThreadInput,
} from "./deepLinks";

describe("Codex deep links", () => {
  it("builds the Codex home link", () => {
    expect(buildCodexHomeLink()).toBe("codex://");
  });

  it("builds the Codex settings link", () => {
    expect(buildCodexSettingsLink()).toBe("codex://settings");
  });

  it("builds the Codex new thread link", () => {
    expect(buildCodexNewThreadLink()).toBe("codex://threads/new");
  });

  it("allows only supported Codex links", () => {
    expect(isAllowedCodexLink("codex://")).toBe(true);
    expect(isAllowedCodexLink("codex://settings")).toBe(true);
    expect(isAllowedCodexLink("codex://threads/new")).toBe(true);
    expect(isAllowedCodexLink("codex://auth")).toBe(false);
    expect(isAllowedCodexLink("https://example.com")).toBe(false);
  });

  it("parses canonical thread IDs and links", () => {
    const threadId = "019f72d8-d02e-75d1-9969-d6c5a647c95e";
    expect(parseCodexThreadInput(threadId)).toEqual({ ok: true, threadId });
    expect(parseCodexThreadInput(`codex://threads/${threadId}`)).toEqual({
      ok: true,
      threadId,
    });
    expect(buildCodexThreadLink(threadId)).toBe(`codex://threads/${threadId}`);
  });

  it.each([
    "codex://threads/new",
    "codex://threads/019f72d8-d02e-75d1-9969-d6c5a647c95e/extra",
    "codex://threads/019f72d8-d02e-75d1-9969-d6c5a647c95e?x=1",
    "codex://threads/019f72d8-d02e-75d1-9969-d6c5a647c95e#x",
    "codex://threads/019f72d8-d02e-75d1-9969-d6c5a647c95e%2Fextra",
    "https://chatgpt.com/codex",
    "019f72d8-d02e-75d1-9969-not-hexadecimal",
  ])("rejects unsupported thread input %s", (input) => {
    expect(parseCodexThreadInput(input).ok).toBe(false);
  });
});
