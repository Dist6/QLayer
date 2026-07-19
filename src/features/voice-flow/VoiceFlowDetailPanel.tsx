import type { AppSettings, AudioMode } from "../settings/settingsTypes";
import { listeningVolumeBounds } from "../settings/settingsValidation";
import type { VoiceFlowState } from "./useVoiceFlow";

type VoiceFlowDetailPanelProps = {
  settings: AppSettings;
  voiceFlow: VoiceFlowState;
  onSettingsChange: (settings: AppSettings) => void;
};

const audioOptions: ReadonlyArray<{ value: AudioMode; label: string }> = [
  { value: "disabled", label: "Off" },
  { value: "duck", label: "Lower" },
  { value: "mute", label: "Mute" },
];

export function VoiceFlowDetailPanel({
  settings,
  voiceFlow,
  onSettingsChange,
}: VoiceFlowDetailPanelProps) {
  const displayStatus = getDisplayStatus(voiceFlow);
  const updateVoiceFlow = (next: Partial<AppSettings["voiceFlow"]>) => {
    onSettingsChange({
      ...settings,
      voiceFlow: { ...settings.voiceFlow, ...next },
    });
  };

  return (
    <section className="tool-view voice-flow-view">
      <div className="view-heading">
        <div>
          <p className="eyebrow">Voice utility</p>
          <h1>Voice Flow</h1>
        </div>
        <div className={`flow-status flow-status-${displayStatus.tone}`}>
          <span aria-hidden="true" />
          {displayStatus.label}
        </div>
      </div>

      <div className="shortcut-block">
        <p>Hold to talk</p>
        <div className="shortcut-row" aria-label="Hold Control Alt Space to talk">
          <Keycap>Ctrl</Keycap>
          <span>+</span>
          <Keycap>Alt</Keycap>
          <span>+</span>
          <Keycap wide>Space</Keycap>
        </div>
      </div>

      <div className="settings-section">
        <div className="section-label-row">
          <label id="background-audio-label">Background audio</label>
          <span>Restores on release</span>
        </div>
        <div className="segmented-control" aria-labelledby="background-audio-label">
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
      </div>

      {settings.voiceFlow.audioMode === "duck" ? (
        <div className="volume-setting">
          <div className="section-label-row">
            <label htmlFor="listening-volume">Listening volume</label>
            <output htmlFor="listening-volume">{settings.voiceFlow.listeningVolumePercent}%</output>
          </div>
          <input
            aria-label="Listening volume"
            id="listening-volume"
            max={listeningVolumeBounds.max}
            min={listeningVolumeBounds.min}
            onChange={(event) =>
              updateVoiceFlow({ listeningVolumePercent: Number(event.target.value) })
            }
            step="1"
            type="range"
            value={settings.voiceFlow.listeningVolumePercent}
          />
        </div>
      ) : null}

      {displayStatus.message ? <p className="flow-message">{displayStatus.message}</p> : null}
    </section>
  );
}

function Keycap({ children, wide = false }: { children: string; wide?: boolean }) {
  return <kbd className={wide ? "keycap keycap-wide" : "keycap"}>{children}</kbd>;
}

function getDisplayStatus(voiceFlow: VoiceFlowState): {
  label: string;
  tone: "ready" | "listening" | "attention";
  message?: string;
} {
  if (voiceFlow.status.status === "dictationStarted") {
    return { label: "Listening", tone: "listening" };
  }

  if (
    voiceFlow.status.status === "failed" ||
    voiceFlow.status.status === "waitingForCodex" ||
    voiceFlow.status.status === "audioUnavailable" ||
    voiceFlow.status.status === "dictationUnavailable"
  ) {
    return {
      label: "Needs attention",
      tone: "attention",
      message: voiceFlow.status.message,
    };
  }

  return { label: "Ready", tone: "ready" };
}
