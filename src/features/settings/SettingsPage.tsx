import type { ReactNode } from "react";

import { PageHeader } from "../../shared/ui/PageHeader";
import { StatusChip } from "../../shared/ui/StatusChip";
import type { AppSettings, AudioMode, RestoreMode } from "./settingsTypes";

type SettingsPageProps = {
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
};

export function SettingsPage({ settings, onSettingsChange }: SettingsPageProps) {
  const update = (next: Partial<AppSettings>) => {
    onSettingsChange({ ...settings, ...next });
  };

  return (
    <section className="page">
      <PageHeader
        title="Settings"
        description="Local preferences for the conservative v0.1 foundation. Settings are stored locally and contain no sensitive data."
      />

      <div className="grid-2">
        <article className="card settings-grid">
          <h2>General</h2>
          <Field label="Launch behavior">
            <input disabled value="Not available yet" readOnly />
          </Field>
          <Field label="Theme">
            <input disabled value="Dark only for v0.1" readOnly />
          </Field>
          <Field label="App language">
            <input disabled value="English only" readOnly />
          </Field>
        </article>

        <article className="card settings-grid">
          <h2>Codex</h2>
          <label className="field">
            <span>Codex integration</span>
            <select
              value={settings.codex.enabled ? "enabled" : "disabled"}
              onChange={(event) =>
                update({ codex: { ...settings.codex, enabled: event.target.value === "enabled" } })
              }
            >
              <option value="enabled">Enabled</option>
              <option value="disabled">Disabled</option>
            </select>
          </label>
          <Field label="Codex dictation shortcut">
            <input
              value={settings.codex.dictationShortcut}
              onChange={(event) =>
                update({ codex: { ...settings.codex, dictationShortcut: event.target.value } })
              }
            />
          </Field>
        </article>
      </div>

      <article className="card settings-grid">
        <div className="button-row">
          <h2>Voice Flow</h2>
          <StatusChip tone="warning">Native automation planned</StatusChip>
        </div>
        <div className="grid-2">
          <Field label="Voice Flow hotkey">
            <input
              value={settings.voiceFlow.hotkey}
              onChange={(event) =>
                update({ voiceFlow: { ...settings.voiceFlow, hotkey: event.target.value } })
              }
            />
          </Field>
          <label className="field">
            <span>Audio mode</span>
            <select
              value={settings.voiceFlow.audioMode}
              onChange={(event) =>
                update({
                  voiceFlow: {
                    ...settings.voiceFlow,
                    audioMode: event.target.value as AudioMode,
                  },
                })
              }
            >
              <option value="disabled">Disabled</option>
              <option value="duck">Duck audio</option>
              <option value="mute">Mute audio</option>
            </select>
          </label>
          <label className="field">
            <span>Restore mode</span>
            <select
              value={settings.voiceFlow.restoreMode}
              onChange={(event) =>
                update({
                  voiceFlow: {
                    ...settings.voiceFlow,
                    restoreMode: event.target.value as RestoreMode,
                  },
                })
              }
            >
              <option value="manual">Manual</option>
              <option value="afterTimeout">After timeout</option>
            </select>
          </label>
          <Field label="Restore timeout seconds">
            <input
              min={3}
              max={300}
              type="number"
              value={settings.voiceFlow.restoreTimeoutSeconds}
              onChange={(event) =>
                update({
                  voiceFlow: {
                    ...settings.voiceFlow,
                    restoreTimeoutSeconds: Number(event.target.value),
                  },
                })
              }
            />
          </Field>
        </div>
      </article>

      <article className="card">
        <h2>Privacy defaults</h2>
        <p>
          No telemetry, no cloud sync, no credential access, no token access, no browser cookie
          access, and no proxy behavior.
        </p>
      </article>
    </section>
  );
}

type FieldProps = {
  label: string;
  children: ReactNode;
};

function Field({ label, children }: FieldProps) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
