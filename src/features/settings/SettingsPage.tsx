import type { GlobalHotkeyStatus } from "../global-hotkeys/globalHotkeyEvents";
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

  return (
    <section className="tool-view settings-view">
      <div className="view-heading">
        <div>
          <p className="eyebrow">QoLayer</p>
          <h1>Settings</h1>
        </div>
      </div>

      <div className="setting-list">
        <ToggleSetting
          checked={settings.general.launchAtStartup}
          description="Start QoLayer when you sign in."
          label="Launch at startup"
          onChange={(checked) => updateGeneral({ launchAtStartup: checked })}
        />
        <ToggleSetting
          checked={settings.general.closeToTray}
          description="Keep shortcuts available after closing."
          label="Close to tray"
          onChange={(checked) => updateGeneral({ closeToTray: checked })}
        />
        <div className="readonly-setting">
          <div>
            <strong>Voice Flow shortcut</strong>
            <span>{globalHotkeyStatus.state === "active" ? "Active" : "Not available"}</span>
          </div>
          <code>{globalHotkeyStatus.shortcut}</code>
        </div>
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
