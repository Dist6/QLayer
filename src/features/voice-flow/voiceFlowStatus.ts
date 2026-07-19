import type { VoiceFlowStep } from "./controllers";

const visibleStatusMessages: Partial<Record<VoiceFlowStep["status"], string>> = {
  audioDucked: "Audio lowered.",
  audioMuted: "Audio muted.",
  restored: "Audio restored.",
  nothingToRestore: "Nothing to restore.",
  codexFocused: "Codex focused.",
  codexFocusNotConfirmed: "Codex could not be focused.",
  waitingForCodex: "Waiting for Codex. Open Codex, then hold Ctrl+Alt+Space again.",
  audioUnavailable: "Audio control is not available.",
  dictationSent: "Dictation shortcut sent.",
  dictationStarted: "Dictation is listening.",
  dictationStopped: "Dictation shortcut released.",
  dictationUnavailable: "Dictation automation is not available.",
  failed: "Audio control failed.",
};

export function readVoiceFlowMessages(steps: VoiceFlowStep[]): string[] {
  const messages: string[] = [];

  for (const step of steps) {
    const message = readStepMessage(step);

    if (message && !messages.includes(message)) {
      messages.push(message);
    }
  }

  return messages;
}

function readStepMessage(step: VoiceFlowStep): string | null {
  if (
    step.status === "audioUnavailable" ||
    step.status === "failed" ||
    step.status === "nothingToRestore" ||
    step.status === "restored"
  ) {
    return step.message;
  }

  return visibleStatusMessages[step.status] ?? null;
}
