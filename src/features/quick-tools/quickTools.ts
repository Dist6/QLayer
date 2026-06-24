import { Keyboard, Layers, Puzzle, type LucideIcon } from "lucide-react";

export type QuickToolId = "voiceFlow" | "globalHotkeys" | "addOns";

export type QuickToolStatus = "ready" | "planned";

export type QuickTool = {
  id: QuickToolId;
  title: string;
  status: QuickToolStatus;
  description: string;
  icon: LucideIcon;
};

export type QuickToolTarget =
  | { view: "voiceFlow" }
  | { view: "plannedTool"; toolId: Exclude<QuickToolId, "voiceFlow"> };

export const quickTools: QuickTool[] = [
  {
    id: "voiceFlow",
    title: "Voice Flow",
    status: "ready",
    description: "Speak to Codex faster",
    icon: Layers,
  },
  {
    id: "globalHotkeys",
    title: "Global Hotkeys",
    status: "planned",
    description: "Trigger tools from anywhere",
    icon: Keyboard,
  },
  {
    id: "addOns",
    title: "Add-ons",
    status: "planned",
    description: "Community tools later",
    icon: Puzzle,
  },
];

export function getQuickToolTarget(id: QuickToolId): QuickToolTarget {
  if (id === "voiceFlow") {
    return { view: "voiceFlow" };
  }

  return { view: "plannedTool", toolId: id };
}
