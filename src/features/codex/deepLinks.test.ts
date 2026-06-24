import { describe, expect, it } from "vitest";

import { buildCodexHomeLink, buildCodexNewThreadLink, buildCodexSettingsLink } from "./deepLinks";

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
});
