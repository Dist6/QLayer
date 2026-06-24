import { RotateCcw, Waves } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "../../shared/ui/Button";
import { PageHeader } from "../../shared/ui/PageHeader";
import { StatusChip } from "../../shared/ui/StatusChip";
import type { AppSettings } from "../settings/settingsTypes";
import type { VoiceFlowStep } from "./controllers";
import { audioController, codexController, keyboardController } from "./nativeControllers";
import { restoreVoiceFlowAudio, startVoiceFlow } from "./voiceFlowService";

type VoiceFlowPageProps = {
  settings: AppSettings;
};

export function VoiceFlowPage({ settings }: VoiceFlowPageProps) {
  const [status, setStatus] = useState<VoiceFlowStep>({
    status: "ready",
    message: "Ready.",
  });
  const [steps, setSteps] = useState<VoiceFlowStep[]>([]);
  const [running, setRunning] = useState(false);

  const configurationSummary = useMemo(
    () => [
      `Target: Codex`,
      `Dictation shortcut: ${settings.codex.dictationShortcut}`,
      `Audio mode: ${formatAudioMode(settings.voiceFlow.audioMode)}`,
      `Restore mode: ${formatRestoreMode(settings.voiceFlow.restoreMode)}`,
    ],
    [settings],
  );

  const start = async () => {
    setRunning(true);
    setStatus({ status: "openingCodex", message: "Starting Voice Flow." });

    const result = await startVoiceFlow({
      settings,
      audio: audioController,
      codex: codexController,
      keyboard: keyboardController,
    });

    setSteps(result.steps);
    setStatus(result.steps.at(-1) ?? { status: result.status, message: "Voice Flow finished." });
    setRunning(false);
  };

  const restore = async () => {
    const restored = await restoreVoiceFlowAudio(audioController);
    setStatus(restored);
    setSteps((current) => [...current, restored]);
  };

  return (
    <section className="page">
      <PageHeader
        title="Voice Flow"
        description="A conservative v0.1 workflow for opening Codex and making unavailable native behavior explicit."
      />

      <div className="grid-2">
        <article className="card stack">
          <StatusChip tone={status.status === "failed" ? "danger" : "success"}>
            {status.message}
          </StatusChip>
          <div className="button-row">
            <Button disabled={running} onClick={() => void start()} variant="primary">
              <Waves size={17} /> Start Voice Flow
            </Button>
            <Button disabled={running} onClick={() => void restore()}>
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
