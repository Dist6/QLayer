import type { AudioMode } from "../settings/settingsTypes";
import type { ToolboxView } from "./toolboxViews";

export const TOOLBOX_WINDOW_WIDTH = 440;

export function getToolboxWindowHeight(view: ToolboxView | "about", audioMode: AudioMode): number {
  switch (view) {
    case "voiceFlow":
      return audioMode === "duck" ? 384 : 330;
    case "chatShortcuts":
      return 450;
    case "localhostManager":
      return 450;
    case "projects":
      return 450;
    case "savedPrompts":
      return 300;
    case "settings":
      return 430;
    case "about":
      return 350;
  }
}
