import {
  Keyboard,
  Layers,
  Monitor,
  Puzzle,
  RotateCcw,
  Speaker,
  type LucideIcon,
} from "lucide-react";

export type QuickToolId =
  | "startVoiceFlow"
  | "restoreAudio"
  | "trayControls"
  | "globalHotkeys"
  | "audioControl"
  | "addOns";

export type QuickToolStatus = "ready" | "active" | "planned";

export type QuickTool = {
  id: QuickToolId;
  title: string;
  status: QuickToolStatus;
  icon: LucideIcon;
};

export const quickTools: QuickTool[] = [
  {
    id: "startVoiceFlow",
    title: "Start Voice Flow",
    status: "ready",
    icon: Layers,
  },
  {
    id: "restoreAudio",
    title: "Restore Audio",
    status: "planned",
    icon: RotateCcw,
  },
  {
    id: "trayControls",
    title: "Tray Controls",
    status: "active",
    icon: Monitor,
  },
  {
    id: "globalHotkeys",
    title: "Global Hotkeys",
    status: "planned",
    icon: Keyboard,
  },
  {
    id: "audioControl",
    title: "Audio Control",
    status: "planned",
    icon: Speaker,
  },
  {
    id: "addOns",
    title: "Add-ons",
    status: "planned",
    icon: Puzzle,
  },
];
