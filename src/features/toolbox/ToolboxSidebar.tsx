import {
  IconBookmarks,
  IconFolders,
  IconMessages,
  IconMicrophone,
  IconServer,
  IconSettings,
  type Icon,
} from "@tabler/icons-react";

import qolayerLogo from "../../assets/qolayer-logo.png";
import type { ToolboxView } from "./toolboxViews";

type ToolboxSidebarProps = {
  activeView: ToolboxView | "about";
  onSelect: (view: ToolboxView) => void;
};

const navigationItems: ReadonlyArray<{
  id: ToolboxView;
  label: string;
  icon: Icon;
}> = [
  { id: "voiceFlow", label: "Voice Flow", icon: IconMicrophone },
  { id: "localhostManager", label: "Localhost Manager", icon: IconServer },
  { id: "projects", label: "Projects", icon: IconFolders },
  { id: "chatShortcuts", label: "Chat shortcuts", icon: IconMessages },
  { id: "savedPrompts", label: "Saved prompts", icon: IconBookmarks },
];

export function ToolboxSidebar({ activeView, onSelect }: ToolboxSidebarProps) {
  return (
    <aside className="toolbox-sidebar" aria-label="Toolbox navigation">
      <div className="sidebar-brand" aria-label="QoLayer">
        <img alt="" src={qolayerLogo} />
      </div>

      <nav className="sidebar-navigation">
        {navigationItems.map(({ id, label, icon: NavigationIcon }) => (
          <button
            aria-current={activeView === id ? "page" : undefined}
            aria-label={label}
            className="sidebar-button"
            key={id}
            onClick={() => onSelect(id)}
            title={label}
            type="button"
          >
            <NavigationIcon aria-hidden="true" size={19} stroke={1.7} />
          </button>
        ))}
      </nav>

      <button
        aria-current={activeView === "settings" ? "page" : undefined}
        aria-label="Settings"
        className="sidebar-button sidebar-settings"
        onClick={() => onSelect("settings")}
        title="Settings"
        type="button"
      >
        <IconSettings aria-hidden="true" size={19} stroke={1.7} />
      </button>
    </aside>
  );
}
