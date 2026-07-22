import { describe, expect, it } from "vitest";

import { buildCodexUnavailableMessage } from "./voiceFlowAvailability";

describe("Voice Flow availability copy", () => {
  it("names both supported apps and gives the next action", () => {
    expect(buildCodexUnavailableMessage("Ctrl+Win")).toBe(
      "Codex or ChatGPT isn't open. Open either app, then hold Ctrl+Win again.",
    );
  });
});
