import { describe, expect, it } from "vitest";

import {
  buildCodexHomeLink,
  buildCodexNewThreadLink,
  buildCodexSettingsLink,
  isAllowedCodexLink,
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
});
