import type { VoiceFlowStep } from "./controllers";

const visibleStatusMessages: Partial<Record<VoiceFlowStep["status"], string>> = {
  codexOpened: "Codex opened.",
  audioUnavailable: "Audio is not implemented yet.",
  dictationUnavailable: "Dictation automation is not implemented yet.",
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
  if (step.message === "Audio restore is not implemented yet.") {
    return step.message;
  }

  return visibleStatusMessages[step.status] ?? null;
}
