import { describe, expect, it } from "vitest";

import { getQuickToolTarget, quickTools } from "./quickTools";

describe("quick tools", () => {
  it("keeps only feature modules in the top-level list", () => {
    expect(quickTools.map((tool) => tool.title)).toEqual([
      "Voice Flow",
      "Global Hotkeys",
      "Add-ons",
    ]);
  });

  it("marks only Voice Flow as ready", () => {
    expect(quickTools.map((tool) => [tool.id, tool.status, tool.description])).toEqual([
      ["voiceFlow", "ready", "Speak to Codex faster"],
      ["globalHotkeys", "planned", "Trigger tools from anywhere"],
      ["addOns", "planned", "Community tools later"],
    ]);
  });

  it("maps tool modules to app views", () => {
    expect(getQuickToolTarget("voiceFlow")).toEqual({ view: "voiceFlow" });
    expect(getQuickToolTarget("globalHotkeys")).toEqual({
      view: "plannedTool",
      toolId: "globalHotkeys",
    });
    expect(getQuickToolTarget("addOns")).toEqual({ view: "plannedTool", toolId: "addOns" });
  });
});
