import { describe, expect, it } from "vitest";

import { getQuickToolStatus, getQuickToolTarget, quickTools } from "./quickTools";

describe("quick tools", () => {
  it("keeps only feature modules in the top-level list", () => {
    expect(quickTools.map((tool) => tool.title)).toEqual([
      "Voice Flow",
      "Global Hotkeys",
      "Add-ons",
    ]);
  });

  it("maps tool module status from global hotkey registration", () => {
    expect(
      quickTools.map((tool) => [
        tool.id,
        getQuickToolStatus(tool.id, { state: "active" }),
        tool.description,
      ]),
    ).toEqual([
      ["voiceFlow", "ready", "Speak to Codex faster"],
      ["globalHotkeys", "active", "Trigger tools from anywhere"],
      ["addOns", "planned", "Community tools later"],
    ]);

    expect(getQuickToolStatus("globalHotkeys", { state: "failed" })).toBe("failed");
    expect(getQuickToolStatus("globalHotkeys", { state: "notAvailable" })).toBe("notAvailable");
  });

  it("maps tool modules to app views", () => {
    expect(getQuickToolTarget("voiceFlow")).toEqual({ view: "voiceFlow" });
    expect(getQuickToolTarget("globalHotkeys")).toEqual({ view: "globalHotkeys" });
    expect(getQuickToolTarget("addOns")).toEqual({ view: "plannedTool", toolId: "addOns" });
  });
});
