import { useMemo, useState } from "react";

import { AboutPage } from "../features/about/AboutPage";
import { CodexPage } from "../features/codex/CodexPage";
import { HomePage } from "../features/home/HomePage";
import { PrivacyPage } from "../features/privacy/PrivacyPage";
import { SettingsPage } from "../features/settings/SettingsPage";
import { createSettingsStorage } from "../features/settings/settingsStorage";
import type { AppSettings } from "../features/settings/settingsTypes";
import { VoiceFlowPage } from "../features/voice-flow/VoiceFlowPage";
import { navigationItems, type PageId } from "./navigation";

export function App() {
  const storage = useMemo(() => createSettingsStorage(window.localStorage), []);
  const loaded = useMemo(() => storage.load(), [storage]);
  const [activePage, setActivePage] = useState<PageId>("home");
  const [settings, setSettingsState] = useState<AppSettings>(loaded.settings);

  const setSettings = (next: AppSettings) => {
    setSettingsState(next);
    storage.save(next);
  };

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Primary navigation">
        <div className="brand-block">
          <div className="brand-mark">QO</div>
          <div>
            <div className="brand-name">QoLayer</div>
            <div className="brand-tagline">Quality-of-life tools</div>
          </div>
        </div>

        <nav className="nav-list">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const selected = item.id === activePage;

            return (
              <button
                key={item.id}
                className={`nav-item ${selected ? "nav-item-active" : ""}`}
                onClick={() => setActivePage(item.id)}
                type="button"
              >
                <Icon size={18} aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <span>v0.1.0</span>
          <span>Local-first</span>
        </div>
      </aside>

      <main className="main-panel">{renderPage(activePage, settings, setSettings)}</main>
    </div>
  );
}

function renderPage(
  activePage: PageId,
  settings: AppSettings,
  setSettings: (settings: AppSettings) => void,
) {
  switch (activePage) {
    case "home":
      return <HomePage />;
    case "codex":
      return <CodexPage />;
    case "voiceFlow":
      return <VoiceFlowPage settings={settings} />;
    case "settings":
      return <SettingsPage settings={settings} onSettingsChange={setSettings} />;
    case "privacy":
      return <PrivacyPage />;
    case "about":
      return <AboutPage />;
    default:
      return <HomePage />;
  }
}
