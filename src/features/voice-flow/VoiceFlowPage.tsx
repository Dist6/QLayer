import { RotateCcw, Waves } from "lucide-react";
import { useMemo } from "react";

import { Button } from "../../shared/ui/Button";
import { PageHeader } from "../../shared/ui/PageHeader";
import { StatusChip } from "../../shared/ui/StatusChip";
import type { TrayStatus } from "../tray/trayEvents";
import type { AppSettings } from "../settings/settingsTypes";
import type { VoiceFlowStep } from "./controllers";

type VoiceFlowPageProps = {
  settings: AppSettings;
  status: VoiceFlowStep;
  steps: VoiceFlowStep[];
  running: boolean;
  trayStatus: TrayStatus;
  onStart: () => Promise<void>;
  onRestore: () => Promise<void>;
};

export function VoiceFlowPage({
  settings,
  status,
  steps,
  running,
  trayStatus,
  onStart,
  onRestore,
}: VoiceFlowPageProps) {
  const configurationSummary = useMemo(
    () => [
      `Target: Codex`,
      `Dictation shortcut: ${settings.codex.dictationShortcut}`,
      `Audio mode: ${formatAudioMode(settings.voiceFlow.audioMode)}`,
      `Restore mode: ${formatRestoreMode(settings.voiceFlow.restoreMode)}`,
    ],
    [settings],
  );

  return (
    <section className="page">
      <PageHeader
        title="Voice Flow"
        description="A conservative v0.1 workflow for opening Codex and making unavailable native behavior explicit."
      />

      <div className="grid-2">
        <article className="card stack">
          <StatusChip tone={readStatusTone(status.status)}>{status.message}</StatusChip>
          <div className="button-row">
            <Button disabled={running} onClick={() => void onStart()} variant="primary">
              <Waves size={17} /> Start Voice Flow
            </Button>
            <Button disabled={running} onClick={() => void onRestore()}>
              <RotateCcw size={17} /> Restore Audio
            </Button>
          </div>
        </article>

        <article className="card stack">
          <h2>Current configuration</h2>
          <ul className="timeline">
            {configurationSummary.map((item) => (
              <li key={item}>
                <span className="timeline-dot" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </article>
      </div>

      <article className="card stack">
        <div className="button-row">
          <h2>System tray</h2>
          <StatusChip tone={trayStatus.available ? "success" : "warning"}>
            {trayStatus.available ? "Available" : "Unavailable"}
          </StatusChip>
        </div>
        <p>{trayStatus.message}</p>
      </article>

      <article className="card stack">
        <h2>Run log</h2>
        {steps.length === 0 ? (
          <p>No run has started yet.</p>
        ) : (
          <ul className="timeline">
            {steps.map((step, index) => (
              <li key={`${step.status}-${index}`}>
                <span className="timeline-dot" />
                <span>{step.message}</span>
              </li>
            ))}
          </ul>
        )}
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

function readStatusTone(status: VoiceFlowStep["status"]): "danger" | "success" | "warning" {
  if (status === "failed") {
    return "danger";
  }

  if (status === "audioUnavailable" || status === "dictationUnavailable") {
    return "warning";
  }

  return "success";
}
