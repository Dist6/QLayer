import { ArrowLeft, RotateCcw, Waves } from "lucide-react";

import { Button } from "../../shared/ui/Button";
import { StatusChip } from "../../shared/ui/StatusChip";
import type { AppSettings } from "../settings/settingsTypes";
import type { VoiceFlowState } from "./useVoiceFlow";
import { readVoiceFlowMessages } from "./voiceFlowStatus";

type VoiceFlowDetailPanelProps = {
  settings: AppSettings;
  voiceFlow: VoiceFlowState;
  onBack: () => void;
};

export function VoiceFlowDetailPanel({ settings, voiceFlow, onBack }: VoiceFlowDetailPanelProps) {
  const messages = readVoiceFlowMessages(voiceFlow.steps);

  return (
    <section className="secondary-view">
      <button className="back-button" onClick={onBack} type="button">
        <ArrowLeft size={16} aria-hidden="true" /> Quick Tools
      </button>

      <div className="detail-heading">
        <h1>Voice Flow</h1>
        <StatusChip tone="warning">Ready</StatusChip>
      </div>

      <article className="compact-card">
        <div className="button-row">
          <Button
            disabled={voiceFlow.running}
            onClick={() => void voiceFlow.start()}
            variant="primary"
          >
            <Waves size={17} aria-hidden="true" /> Start Voice Flow
          </Button>
          <Button disabled={voiceFlow.running} onClick={() => void voiceFlow.restore()}>
            <RotateCcw size={17} aria-hidden="true" /> Restore Audio
          </Button>
        </div>

        {messages.length > 0 ? (
          <div className="status-list">
            {messages.map((message) => (
              <p key={message}>{message}</p>
            ))}
          </div>
        ) : null}
      </article>

      <article className="compact-card settings-grid">
        <h2>Status</h2>
        <dl className="detail-list">
          <div>
            <dt>Integration</dt>
            <dd>Codex</dd>
          </div>
          <div>
            <dt>Dictation shortcut</dt>
            <dd>{settings.codex.dictationShortcut}</dd>
          </div>
          <div>
            <dt>Audio mode</dt>
            <dd>{formatAudioMode(settings.voiceFlow.audioMode)}</dd>
          </div>
          <div>
            <dt>Audio status</dt>
            <dd>{formatAudioStatus(voiceFlow.status.status)}</dd>
          </div>
          <div>
            <dt>Restore mode</dt>
            <dd>{formatRestoreMode(settings.voiceFlow.restoreMode)}</dd>
          </div>
        </dl>
      </article>
    </section>
  );
}

function formatAudioMode(mode: AppSettings["voiceFlow"]["audioMode"]): string {
  switch (mode) {
    case "disabled":
      return "Disabled";
    case "duck":
      return "Duck audio";
    case "mute":
      return "Mute audio";
  }
}

function formatRestoreMode(mode: AppSettings["voiceFlow"]["restoreMode"]): string {
  return mode === "manual" ? "Manual" : "After timeout";
}

function formatAudioStatus(status: VoiceFlowState["status"]["status"]): string {
  switch (status) {
    case "audioDucked":
      return "Lowered";
    case "audioMuted":
      return "Muted";
    case "restored":
      return "Restored";
    case "nothingToRestore":
      return "Nothing to restore";
    case "audioUnavailable":
      return "Not available";
    case "failed":
      return "Failed";
    default:
      return "Ready";
  }
}
