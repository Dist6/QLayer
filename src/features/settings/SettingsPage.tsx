import type { ReactNode } from "react";

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
    <section className="secondary-view">
      <h1>Settings</h1>

      <article className="compact-card settings-grid">
        <h2>General</h2>
        <Field label="Integration">
          <input disabled value="Codex" readOnly />
        </Field>
        <Field label="Theme">
          <input disabled value="Dark" readOnly />
        </Field>
        <Field label="Language">
          <input disabled value="English" readOnly />
        </Field>
      </article>

      <article className="compact-card settings-grid">
        <h2>Codex</h2>
        <label className="field">
          <span>Integration</span>
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
        <Field label="Dictation shortcut">
          <input
            value={settings.codex.dictationShortcut}
            onChange={(event) =>
              update({ codex: { ...settings.codex, dictationShortcut: event.target.value } })
            }
          />
        </Field>
      </article>

      <article className="compact-card settings-grid">
        <div className="button-row">
          <h2>Voice Flow</h2>
          <StatusChip>Planned</StatusChip>
        </div>
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
