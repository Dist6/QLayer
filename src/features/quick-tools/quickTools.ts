import { Keyboard, Layers, Puzzle, type LucideIcon } from "lucide-react";

import type { GlobalHotkeyStatusState } from "../global-hotkeys/globalHotkeyEvents";

export type QuickToolId = "voiceFlow" | "globalHotkeys" | "addOns";

export type QuickToolStatus = "ready" | "active" | "failed" | "notAvailable" | "planned";

export type QuickTool = {
  id: QuickToolId;
  title: string;
  description: string;
  icon: LucideIcon;
};

export type QuickToolTarget =
  | { view: "voiceFlow" }
  | { view: "globalHotkeys" }
  | { view: "plannedTool"; toolId: "addOns" };

export const quickTools: QuickTool[] = [
  {
    id: "voiceFlow",
    title: "Voice Flow",
    description: "Speak to Codex faster",
    icon: Layers,
  },
  {
    id: "globalHotkeys",
    title: "Global Hotkeys",
    description: "Trigger tools from anywhere",
    icon: Keyboard,
  },
  {
    id: "addOns",
    title: "Add-ons",
    description: "Community tools later",
    icon: Puzzle,
  },
];

export function getQuickToolTarget(id: QuickToolId): QuickToolTarget {
  if (id === "voiceFlow") {
    return { view: "voiceFlow" };
  }

  if (id === "globalHotkeys") {
    return { view: "globalHotkeys" };
  }

  return { view: "plannedTool", toolId: id };
}

export function getQuickToolStatus(
  id: QuickToolId,
  globalHotkeyStatus: { state: GlobalHotkeyStatusState },
): QuickToolStatus {
  if (id === "voiceFlow") {
    return "ready";
  }

  if (id === "globalHotkeys") {
    return globalHotkeyStatus.state;
  }

  return "planned";
}
