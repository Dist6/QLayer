import { isTauri } from "@tauri-apps/api/core";
import { LogicalSize } from "@tauri-apps/api/dpi";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { AboutPanel } from "../features/about/AboutPanel";
import { ChatShortcutsPanel } from "../features/chat-shortcuts/ChatShortcutsPanel";
import { useChatDestinations } from "../features/chat-shortcuts/useChatDestinations";
import { openCodexAction } from "../features/codex/codexController";
import {
  getGlobalHotkeyStatus,
  listenForGlobalHotkeyActions,
  listenForGlobalHotkeyStatus,
  setGlobalHotkey,
} from "../features/global-hotkeys/globalHotkeyClient";
import {
  DEFAULT_GLOBAL_HOTKEY_SHORTCUT,
  type GlobalHotkeyStatus,
} from "../features/global-hotkeys/globalHotkeyEvents";
import { LocalhostManagerPanel } from "../features/localhost-manager/LocalhostManagerPanel";
import { ProjectsPanel } from "../features/projects/ProjectsPanel";
import { useProjects } from "../features/projects/useProjects";
import { SettingsPage } from "../features/settings/SettingsPage";
import { syncLaunchAtStartup } from "../features/settings/autostartClient";
import { createSettingsStorage } from "../features/settings/settingsStorage";
import type { AppSettings } from "../features/settings/settingsTypes";
import { setCloseToTray } from "../features/settings/windowBehaviorClient";
import { ToolboxSidebar } from "../features/toolbox/ToolboxSidebar";
import type { ToolboxView } from "../features/toolbox/toolboxViews";
import { hideToolboxWindow } from "../features/toolbox/toolboxWindowClient";
import { TOOLBOX_WINDOW_HEIGHT, TOOLBOX_WINDOW_WIDTH } from "../features/toolbox/windowSizing";
import { listenForTrayActions } from "../features/tray/trayClient";
import { VoiceFlowDetailPanel } from "../features/voice-flow/VoiceFlowDetailPanel";
import { isWindowDismissSuspended } from "../shared/windowFocusGuard";
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
  const shortcutRecordingRef = useRef(false);
  const chatDestinations = useChatDestinations();
  const projects = useProjects();
  const voiceFlow = useVoiceFlow(settings, chatDestinations.destinations, projects.projects);
  const { reportMessage, restore, startHold, stopHold } = voiceFlow;

  const setSettings = (next: AppSettings) => {
    setSettingsState(next);
    storage.save(next);
  };

  useEffect(() => {
    const requestedShortcut = loaded.settings.voiceFlow.hotkey;
    const applyStatus = (status: GlobalHotkeyStatus) => {
      setGlobalHotkeyStatus(status);
      if (status.state === "active" && status.shortcut !== requestedShortcut) {
        setSettingsState((current) => {
          const repaired = {
            ...current,
            voiceFlow: { ...current.voiceFlow, hotkey: status.shortcut },
          };
          storage.save(repaired);
          return repaired;
        });
      }
    };

    void setGlobalHotkey(requestedShortcut)
      .then(applyStatus)
      .catch(() => void getGlobalHotkeyStatus().then(applyStatus));
  }, [loaded.settings.voiceFlow.hotkey, storage]);

  const changeGlobalHotkey = useCallback(
    async (shortcut: string) => {
      try {
        const status = await setGlobalHotkey(shortcut);
        setGlobalHotkeyStatus(status);
        setSettingsState((current) => {
          const next = {
            ...current,
            voiceFlow: { ...current.voiceFlow, hotkey: status.shortcut },
          };
          storage.save(next);
          return next;
        });
        return { ok: true } as const;
      } catch (error) {
        return {
          ok: false,
          message: typeof error === "string" ? error : "The shortcut could not be changed.",
        } as const;
      }
    },
    [storage],
  );

  const setShortcutRecording = useCallback((recording: boolean) => {
    shortcutRecordingRef.current = recording;
  }, []);

  useEffect(() => {
    void setCloseToTray(settings.general.closeToTray).catch(() => undefined);
  }, [settings.general.closeToTray]);

  useEffect(() => {
    void syncLaunchAtStartup(settings.general.launchAtStartup).catch(() => undefined);
  }, [settings.general.launchAtStartup]);

  useEffect(() => {
    if (!isTauri()) return;

    void getCurrentWindow()
      .setSize(new LogicalSize(TOOLBOX_WINDOW_WIDTH, TOOLBOX_WINDOW_HEIGHT))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!isTauri()) return;

    let dismissTimer: number | undefined;
    const hideWhenFocusLeaves = () => {
      globalThis.clearTimeout(dismissTimer);
      dismissTimer = globalThis.setTimeout(() => {
        const modalOpen = document.querySelector("dialog[open]") !== null;
        if (!document.hasFocus() && !modalOpen && !isWindowDismissSuspended()) {
          void hideToolboxWindow();
        }
      }, 80);
    };

    window.addEventListener("blur", hideWhenFocusLeaves);
    return () => {
      globalThis.clearTimeout(dismissTimer);
      window.removeEventListener("blur", hideWhenFocusLeaves);
    };
  }, []);

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
        if (shortcutRecordingRef.current) return;

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

      <ToolboxSidebar activeView={activeView} onSelect={setActiveView} />

      <main className="main-panel" id="main-content">
        <div className="tool-view-stage" key={activeView}>
          {renderView(
            activeView,
            settings,
            setSettings,
            voiceFlow,
            globalHotkeyStatus,
            chatDestinations,
            projects,
            changeGlobalHotkey,
            setShortcutRecording,
          )}
        </div>
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
  projects: ReturnType<typeof useProjects>,
  changeGlobalHotkey: (shortcut: string) => Promise<{ ok: true } | { ok: false; message: string }>,
  setShortcutRecording: (recording: boolean) => void,
) {
  switch (activeView) {
    case "chatShortcuts":
      return <ChatShortcutsPanel state={chatDestinations} />;
    case "localhostManager":
      return (
        <LocalhostManagerPanel autoRefreshSeconds={settings.localhostManager.autoRefreshSeconds} />
      );
    case "projects":
      return (
        <ProjectsPanel
          autoRefreshSeconds={settings.localhostManager.autoRefreshSeconds}
          chats={chatDestinations}
          state={projects}
        />
      );
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
          onGlobalHotkeyChange={changeGlobalHotkey}
          onShortcutRecordingChange={setShortcutRecording}
        />
      );
  }
}
