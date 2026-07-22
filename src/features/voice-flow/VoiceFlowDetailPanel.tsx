import { IconInfoCircle } from "@tabler/icons-react";

import {
  GlobalHotkeyRecorder,
  type GlobalHotkeyChangeResult,
} from "../global-hotkeys/GlobalHotkeyRecorder";
import type { AppSettings, AudioMode } from "../settings/settingsTypes";
import { listeningVolumeBounds } from "../settings/settingsValidation";
import type { VoiceFlowState } from "./useVoiceFlow";
import { getVoiceFlowDisplayStatus } from "./voiceFlowPresentation";

type VoiceFlowDetailPanelProps = {
  settings: AppSettings;
  voiceFlow: VoiceFlowState;
  onGlobalHotkeyChange: (shortcut: string) => Promise<GlobalHotkeyChangeResult>;
  onSettingsChange: (settings: AppSettings) => void;
  onShortcutRecordingChange: (recording: boolean) => void;
};

const audioOptions: ReadonlyArray<{ value: AudioMode; label: string }> = [
  { value: "disabled", label: "Off" },
  { value: "duck", label: "Lower" },
  { value: "mute", label: "Mute" },
];

export function VoiceFlowDetailPanel({
  settings,
  voiceFlow,
  onGlobalHotkeyChange,
  onSettingsChange,
  onShortcutRecordingChange,
}: VoiceFlowDetailPanelProps) {
  const displayStatus = getVoiceFlowDisplayStatus(voiceFlow.status);
  const selectedAudioIndex = audioOptions.findIndex(
    (option) => option.value === settings.voiceFlow.audioMode,
  );
  const lowerAudio = settings.voiceFlow.audioMode === "duck";
  const updateVoiceFlow = (next: Partial<AppSettings["voiceFlow"]>) => {
    onSettingsChange({
      ...settings,
      voiceFlow: { ...settings.voiceFlow, ...next },
    });
  };

  return (
    <section className="tool-view voice-flow-view">
      <header className="voice-flow-heading">
        <h1>Voice Flow</h1>
        <div className={`flow-status flow-status-${displayStatus.tone}`}>
          <span aria-hidden="true" />
          {displayStatus.label}
        </div>
      </header>

      <div className="flat-setting shortcut-setting">
        <span className="setting-label">Voice shortcut</span>
        <GlobalHotkeyRecorder
          onChange={onGlobalHotkeyChange}
          onRecordingChange={onShortcutRecordingChange}
          shortcut={settings.voiceFlow.hotkey}
        />
      </div>

      <div className="audio-settings">
        <span className="setting-label" id="background-audio-label">
          Background audio
        </span>
        <div
          className={`segmented-control segment-index-${selectedAudioIndex}`}
          aria-labelledby="background-audio-label"
        >
          <span aria-hidden="true" className="segment-indicator" />
          {audioOptions.map((option) => (
            <button
              aria-pressed={settings.voiceFlow.audioMode === option.value}
              key={option.value}
              onClick={() => updateVoiceFlow({ audioMode: option.value })}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>

        <div
          aria-hidden={!lowerAudio}
          className={lowerAudio ? "volume-reveal volume-reveal-open" : "volume-reveal"}
        >
          <div className="volume-reveal-inner">
            <div className="volume-setting">
              <label htmlFor="listening-volume">Listening volume</label>
              <input
                aria-label="Listening volume"
                disabled={!lowerAudio}
                id="listening-volume"
                max={listeningVolumeBounds.max}
                min={listeningVolumeBounds.min}
                onChange={(event) =>
                  updateVoiceFlow({ listeningVolumePercent: Number(event.target.value) })
                }
                step="1"
                style={
                  {
                    "--range-progress": `${getRangeProgress(settings.voiceFlow.listeningVolumePercent)}%`,
                  } as React.CSSProperties
                }
                type="range"
                value={settings.voiceFlow.listeningVolumePercent}
              />
              <output htmlFor="listening-volume">
                {settings.voiceFlow.listeningVolumePercent}%
              </output>
            </div>
          </div>
        </div>
      </div>

      {displayStatus.message ? <p className="flow-message">{displayStatus.message}</p> : null}

      <footer className="voice-flow-footer">
        <IconInfoCircle aria-hidden="true" size={16} stroke={1.6} />
        <span>Audio restores when you release the shortcut.</span>
      </footer>
    </section>
  );
}

function getRangeProgress(value: number): number {
  return (
    ((value - listeningVolumeBounds.min) /
      (listeningVolumeBounds.max - listeningVolumeBounds.min)) *
    100
  );
}
