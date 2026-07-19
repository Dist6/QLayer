import { IconX } from "@tabler/icons-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect, useMemo, useState } from "react";

import { AboutPanel } from "../features/about/AboutPanel";
import { ChatShortcutsPanel } from "../features/chat-shortcuts/ChatShortcutsPanel";
import { useChatDestinations } from "../features/chat-shortcuts/useChatDestinations";
import { openCodexAction } from "../features/codex/codexController";
import {
  getGlobalHotkeyStatus,
  listenForGlobalHotkeyActions,
  listenForGlobalHotkeyStatus,
} from "../features/global-hotkeys/globalHotkeyClient";
import {
  DEFAULT_GLOBAL_HOTKEY_SHORTCUT,
  type GlobalHotkeyStatus,
} from "../features/global-hotkeys/globalHotkeyEvents";
import { SavedPromptsPanel } from "../features/saved-prompts/SavedPromptsPanel";
import { SettingsPage } from "../features/settings/SettingsPage";
import { syncLaunchAtStartup } from "../features/settings/autostartClient";
import { createSettingsStorage } from "../features/settings/settingsStorage";
import type { AppSettings } from "../features/settings/settingsTypes";
import { setCloseToTray } from "../features/settings/windowBehaviorClient";
import { ToolboxSidebar } from "../features/toolbox/ToolboxSidebar";
import type { ToolboxView } from "../features/toolbox/toolboxViews";
import { listenForTrayActions } from "../features/tray/trayClient";
import { VoiceFlowDetailPanel } from "../features/voice-flow/VoiceFlowDetailPanel";
import { useVoiceFlow } from "../features/voice-flow/useVoiceFlow";

type AppView = ToolboxView | "about";

const initialHotkeyStatus: GlobalHotkeyStatus = {
  state: "notAvailable",
  shortcut: DEFAULT_GLOBAL_HOTKEY_SHORTCUT,
  message: "Checking global hotkey status.",
};

export function App() {
  const storage = useMemo(() => createSettingsStorage(window.localStorage), []);
  const loaded = useMemo(() => storage.load(), [storage]);
  const [activeView, setActiveView] = useState<AppView>("voiceFlow");
  const [settings, setSettingsState] = useState<AppSettings>(loaded.settings);
  const [globalHotkeyStatus, setGlobalHotkeyStatus] =
    useState<GlobalHotkeyStatus>(initialHotkeyStatus);
  const chatDestinations = useChatDestinations();
  const voiceFlow = useVoiceFlow(settings);
  const { reportMessage, restore, startHold, stopHold } = voiceFlow;

  const setSettings = (next: AppSettings) => {
    setSettingsState(next);
    storage.save(next);
  };

  useEffect(() => {
    void getGlobalHotkeyStatus().then(setGlobalHotkeyStatus);
  }, []);

  useEffect(() => {
    void setCloseToTray(settings.general.closeToTray).catch(() => undefined);
  }, [settings.general.closeToTray]);

  useEffect(() => {
    void syncLaunchAtStartup(settings.general.launchAtStartup).catch(() => undefined);
  }, [settings.general.launchAtStartup]);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let cancelled = false;

    void listenForGlobalHotkeyStatus(setGlobalHotkeyStatus)
      .then((nextUnlisten) => {
        if (cancelled) {
          nextUnlisten();
        } else {
          unlisten = nextUnlisten;
        }
      })
      .catch(() => {
        setGlobalHotkeyStatus({
          state: "notAvailable",
          shortcut: DEFAULT_GLOBAL_HOTKEY_SHORTCUT,
          message: "Global hotkeys are available only in the desktop app.",
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

    void listenForGlobalHotkeyActions(
      (action) => {
        if (action === "startVoiceFlowHold") {
          setActiveView("voiceFlow");
          void startHold();
        } else {
          void stopHold();
        }
      },
      (message) => reportMessage({ status: "failed", message }),
    )
      .then((nextUnlisten) => {
        if (cancelled) {
          nextUnlisten();
        } else {
          unlisten = nextUnlisten;
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, [reportMessage, startHold, stopHold]);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let cancelled = false;

    void listenForTrayActions(
      (action) => {
        if (action === "openCodex") {
          void openCodexAction("home");
        } else if (action === "restoreAudio") {
          void restore();
        } else {
          setActiveView("about");
        }
      },
      (message) => reportMessage({ status: "failed", message }),
    )
      .then((nextUnlisten) => {
        if (cancelled) {
          nextUnlisten();
        } else {
          unlisten = nextUnlisten;
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, [reportMessage, restore]);

  return (
    <div className="app-shell">
      <div
        aria-hidden="true"
        className="window-drag-region"
        data-tauri-drag-region
        onPointerDown={(event) => {
          if (event.button === 0) {
            void getCurrentWindow().startDragging();
          }
        }}
      />
      <button
        aria-label="Close QoLayer"
        className="window-close"
        onClick={() => void getCurrentWindow().close()}
        title={settings.general.closeToTray ? "Close to tray" : "Close QoLayer"}
        type="button"
      >
        <IconX aria-hidden="true" size={16} stroke={1.7} />
      </button>

      <ToolboxSidebar activeView={activeView} onSelect={setActiveView} />

      <main className="main-panel">
        {renderView(
          activeView,
          settings,
          setSettings,
          voiceFlow,
          globalHotkeyStatus,
          chatDestinations,
        )}
      </main>
    </div>
  );
}

function renderView(
  activeView: AppView,
  settings: AppSettings,
  setSettings: (settings: AppSettings) => void,
  voiceFlow: ReturnType<typeof useVoiceFlow>,
  globalHotkeyStatus: GlobalHotkeyStatus,
  chatDestinations: ReturnType<typeof useChatDestinations>,
) {
  switch (activeView) {
    case "chatShortcuts":
      return <ChatShortcutsPanel state={chatDestinations} />;
    case "savedPrompts":
      return <SavedPromptsPanel />;
    case "settings":
      return (
        <SettingsPage
          globalHotkeyStatus={globalHotkeyStatus}
          onSettingsChange={setSettings}
          settings={settings}
        />
      );
    case "about":
      return <AboutPanel />;
    default:
      return (
        <VoiceFlowDetailPanel
          onSettingsChange={setSettings}
          settings={settings}
          voiceFlow={voiceFlow}
        />
      );
  }
}
