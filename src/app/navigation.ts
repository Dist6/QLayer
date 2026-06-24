import { Bot, Home, Info, Mic, Settings, ShieldCheck, type LucideIcon } from "lucide-react";

export type PageId = "home" | "codex" | "voiceFlow" | "settings" | "privacy" | "about";

export type NavigationItem = {
  id: PageId;
  label: string;
  icon: LucideIcon;
};

export const navigationItems: NavigationItem[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "codex", label: "Codex", icon: Bot },
  { id: "voiceFlow", label: "Voice Flow", icon: Mic },
  { id: "settings", label: "Settings", icon: Settings },
  { id: "privacy", label: "Privacy", icon: ShieldCheck },
  { id: "about", label: "About", icon: Info },
];
