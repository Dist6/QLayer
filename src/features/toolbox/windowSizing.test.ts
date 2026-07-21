import { describe, expect, it } from "vitest";

import { getToolboxWindowHeight, TOOLBOX_WINDOW_WIDTH } from "./windowSizing";

describe("toolbox window sizing", () => {
  it("keeps the approved compact width", () => {
    expect(TOOLBOX_WINDOW_WIDTH).toBe(440);
  });

  it("expands Voice Flow only for the listening-volume control", () => {
    expect(getToolboxWindowHeight("voiceFlow", "disabled")).toBe(330);
    expect(getToolboxWindowHeight("voiceFlow", "mute")).toBe(330);
    expect(getToolboxWindowHeight("voiceFlow", "duck")).toBe(384);
  });

  it("uses bounded heights for the remaining views", () => {
    expect(getToolboxWindowHeight("chatShortcuts", "disabled")).toBe(450);
    expect(getToolboxWindowHeight("localhostManager", "disabled")).toBe(450);
    expect(getToolboxWindowHeight("savedPrompts", "disabled")).toBe(300);
    expect(getToolboxWindowHeight("settings", "disabled")).toBe(430);
    expect(getToolboxWindowHeight("about", "disabled")).toBe(350);
  });
});
