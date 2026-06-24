import { ChevronDown, Info, Settings } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { AboutPanel } from "../features/about/AboutPanel";
import { openCodexAction, type CodexAction } from "../features/codex/codexController";
import { QuickToolsPanel } from "../features/quick-tools/QuickToolsPanel";
import {
  getQuickToolTarget,
  quickTools,
  type QuickToolId,
} from "../features/quick-tools/quickTools";
import { SettingsPage } from "../features/settings/SettingsPage";
import { createSettingsStorage } from "../features/settings/settingsStorage";
import type { AppSettings } from "../features/settings/settingsTypes";
import {
  getTrayStatus,
  listenForTrayActions,
  listenForTrayStatus,
} from "../features/tray/trayClient";
import type { TrayStatus } from "../features/tray/trayEvents";
import { VoiceFlowDetailPanel } from "../features/voice-flow/VoiceFlowDetailPanel";
import { useVoiceFlow, type VoiceFlowState } from "../features/voice-flow/useVoiceFlow";

type AppView = "quickTools" | "voiceFlow" | "plannedTool" | "settings" | "about";

export function App() {
  const storage = useMemo(() => createSettingsStorage(window.localStorage), []);
  const loaded = useMemo(() => storage.load(), [storage]);
  const [activeView, setActiveView] = useState<AppView>("quickTools");
  const [plannedToolId, setPlannedToolId] = useState<QuickToolId>("globalHotkeys");
  const [codexOpen, setCodexOpen] = useState(false);
  const [busyCodexAction, setBusyCodexAction] = useState<CodexAction | null>(null);
  const [settings, setSettingsState] = useState<AppSettings>(loaded.settings);
  const [, setTrayStatus] = useState<TrayStatus>({
    available: false,
    message: "Checking system tray status.",
  });
  const voiceFlow = useVoiceFlow(settings);
  const { reportMessage, restore, start } = voiceFlow;

  const runCodexAction = async (action: CodexAction) => {
    setBusyCodexAction(action);

    await openCodexAction(action);

    setBusyCodexAction(null);
    setCodexOpen(false);
  };

  const setSettings = (next: AppSettings) => {
    setSettingsState(next);
    storage.save(next);
  };

  const openQuickTool = (toolId: QuickToolId) => {
    const target = getQuickToolTarget(toolId);

    if (target.view === "voiceFlow") {
      setActiveView("voiceFlow");
      return;
    }

    setPlannedToolId(target.toolId);
    setActiveView("plannedTool");
  };

  useEffect(() => {
    void getTrayStatus().then(setTrayStatus);
  }, []);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let cancelled = false;

    void listenForTrayStatus(setTrayStatus)
      .then((nextUnlisten) => {
        if (cancelled) {
          nextUnlisten();
        } else {
          unlisten = nextUnlisten;
        }
      })
      .catch(() => {
        setTrayStatus({
          available: false,
          message: "System tray status is available only in the desktop app.",
        });
      });

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, []);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let cancelled = false;

    void listenForTrayActions(
      (action) => {
        setActiveView("voiceFlow");

        if (action === "startVoiceFlow") {
          void start();
        } else {
          void restore();
        }
      },
      (message) => {
        reportMessage({ status: "failed", message });
      },
    )
      .then((nextUnlisten) => {
        if (cancelled) {
          nextUnlisten();
        } else {
          unlisten = nextUnlisten;
        }
      })
      .catch(() => {
        setTrayStatus({
          available: false,
          message: "System tray is available only in the desktop app.",
        });
      });

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, [reportMessage, restore, start]);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand-block">
          <div className="brand-mark" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <button
            className="brand-button"
            onClick={() => setActiveView("quickTools")}
            type="button"
          >
            <div className="brand-name">QoLayer</div>
          </button>
        </div>

        <div className="header-actions">
          <div className="integration-wrap">
            <button
              className="integration-button"
              onClick={() => setCodexOpen((open) => !open)}
              type="button"
            >
              Codex <ChevronDown size={16} aria-hidden="true" />
            </button>
            {codexOpen ? (
              <div className="integration-menu">
                <button
                  disabled={busyCodexAction !== null}
                  onClick={() => void runCodexAction("home")}
                  type="button"
                >
                  Open Codex
                </button>
                <button
                  disabled={busyCodexAction !== null}
                  onClick={() => void runCodexAction("settings")}
                  type="button"
                >
                  Codex Settings
                </button>
                <button
                  disabled={busyCodexAction !== null}
                  onClick={() => void runCodexAction("newThread")}
                  type="button"
                >
                  New Thread
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <main className="main-panel">
        {renderView(
          activeView,
          settings,
          setSettings,
          voiceFlow,
          () => setActiveView("quickTools"),
          openQuickTool,
          plannedToolId,
        )}
      </main>

      <footer className="app-footer">
        <button
          className={activeView === "settings" ? "footer-link footer-link-active" : "footer-link"}
          onClick={() => setActiveView("settings")}
          type="button"
        >
          <Settings size={17} aria-hidden="true" /> Settings
        </button>
        <button
          className={activeView === "about" ? "footer-link footer-link-active" : "footer-link"}
          onClick={() => setActiveView("about")}
          type="button"
        >
          <Info size={17} aria-hidden="true" /> About
        </button>
        <span className="app-version">v0.1.0</span>
      </footer>
    </div>
  );
}

function renderView(
  activeView: AppView,
  settings: AppSettings,
  setSettings: (settings: AppSettings) => void,
  voiceFlow: VoiceFlowState,
  onBack: () => void,
  onOpenTool: (toolId: QuickToolId) => void,
  plannedToolId: QuickToolId,
) {
  switch (activeView) {
    case "voiceFlow":
      return <VoiceFlowDetailPanel settings={settings} voiceFlow={voiceFlow} onBack={onBack} />;
    case "plannedTool":
      return <PlannedToolPanel onBack={onBack} toolId={plannedToolId} />;
    case "settings":
      return <SettingsPage settings={settings} onSettingsChange={setSettings} />;
    case "about":
      return <AboutPanel onBack={onBack} />;
    default:
      return <QuickToolsPanel onOpenTool={onOpenTool} />;
  }
}

function PlannedToolPanel({ toolId, onBack }: { toolId: QuickToolId; onBack: () => void }) {
  const tool = quickTools.find((item) => item.id === toolId);

  return (
    <section className="secondary-view">
      <button className="back-button" onClick={onBack} type="button">
        Quick Tools
      </button>
      <div className="detail-heading">
        <h1>{tool?.title ?? "Planned tool"}</h1>
        <span className="status-chip">Planned</span>
      </div>
      <article className="compact-card">
        <p>Coming later.</p>
      </article>
    </section>
  );
}
