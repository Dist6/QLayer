import { describe, expect, it } from "vitest";

import { quickTools } from "./quickTools";

describe("quick tools", () => {
  it("keeps the tray utility tools in the expected order", () => {
    expect(quickTools.map((tool) => tool.title)).toEqual([
      "Start Voice Flow",
      "Restore Audio",
      "Tray Controls",
      "Global Hotkeys",
      "Audio Control",
      "Add-ons",
    ]);
  });

  it("marks only implemented utility surfaces as ready or active", () => {
    expect(quickTools.map((tool) => [tool.id, tool.status])).toEqual([
      ["startVoiceFlow", "ready"],
      ["restoreAudio", "planned"],
      ["trayControls", "active"],
      ["globalHotkeys", "planned"],
      ["audioControl", "planned"],
      ["addOns", "planned"],
    ]);
  });
});
