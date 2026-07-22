import type { GlobalHotkeyStatus } from "../global-hotkeys/globalHotkeyEvents";
import { getShortcutKeycaps } from "../global-hotkeys/globalHotkeyShortcut";
import type { AppSettings } from "./settingsTypes";

type SettingsPageProps = {
  globalHotkeyStatus: GlobalHotkeyStatus;
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
};

export function SettingsPage({
  globalHotkeyStatus,
  settings,
  onSettingsChange,
}: SettingsPageProps) {
  const updateGeneral = (next: Partial<AppSettings["general"]>) => {
    onSettingsChange({
      ...settings,
      general: { ...settings.general, ...next },
    });
  };
  const updateLocalhostManager = (next: Partial<AppSettings["localhostManager"]>) => {
    onSettingsChange({
      ...settings,
      localhostManager: { ...settings.localhostManager, ...next },
    });
  };

  return (
    <section className="tool-view settings-view">
      <div className="view-heading">
        <h1>Settings</h1>
      </div>

      <div className="setting-list">
        <ToggleSetting
          checked={settings.general.launchAtStartup}
          description="Start QLayer when you sign in."
          label="Launch at startup"
          onChange={(checked) => updateGeneral({ launchAtStartup: checked })}
        />
        <ToggleSetting
          checked={settings.general.closeToTray}
          description="Keep shortcuts available after closing."
          label="Close to tray"
          onChange={(checked) => updateGeneral({ closeToTray: checked })}
        />
        <ToggleSetting
          checked={settings.general.keepVisible}
          description="Keep the window open and above other apps."
          label="Keep QLayer visible"
          onChange={(checked) => updateGeneral({ keepVisible: checked })}
        />
        <div className="readonly-setting">
          <div>
            <strong>Voice Flow shortcut</strong>
            <span>{globalHotkeyStatus.state === "active" ? "Active" : "Not available"}</span>
          </div>
          <div className="mini-keycaps" aria-label={globalHotkeyStatus.shortcut}>
            {getShortcutKeycaps(globalHotkeyStatus.shortcut).map((key) => (
              <kbd key={key}>{key}</kbd>
            ))}
          </div>
        </div>
        <label className="select-setting">
          <span>
            <strong>Localhost auto-refresh</strong>
            <small>Refresh only while the tool is visible.</small>
          </span>
          <select
            aria-label="Localhost auto-refresh"
            onChange={(event) =>
              updateLocalhostManager({
                autoRefreshSeconds:
                  event.target.value === "off"
                    ? null
                    : (Number(event.target.value) as 15 | 30 | 60),
              })
            }
            value={settings.localhostManager.autoRefreshSeconds ?? "off"}
          >
            <option value="off">Off</option>
            <option value="15">15s</option>
            <option value="30">30s</option>
            <option value="60">60s</option>
          </select>
        </label>
      </div>
    </section>
  );
}

function ToggleSetting({
  checked,
  description,
  label,
  onChange,
}: {
  checked: boolean;
  description: string;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="toggle-setting">
      <span>
        <strong>{label}</strong>
        <small>{description}</small>
      </span>
      <input
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
      <span className="toggle-track" aria-hidden="true">
        <span />
      </span>
    </label>
  );
}
