import type { VoiceFlowStep } from "./controllers";

export type VoiceFlowDisplayStatus = {
  label: string;
  tone: "ready" | "checking" | "listening" | "attention";
  message?: string;
};

export function getVoiceFlowDisplayStatus(step: VoiceFlowStep): VoiceFlowDisplayStatus {
  if (step.status === "dictationStarted") {
    return { label: "Listening", tone: "listening" };
  }

  if (
    step.status === "checkingCodex" ||
    step.status === "focusingCodex" ||
    step.status === "selectingChat"
  ) {
    return { label: "Checking", tone: "checking" };
  }

  if (step.status === "waitingForCodex") {
    return { label: "Not detected", tone: "attention", message: step.message };
  }

  if (
    step.status === "failed" ||
    step.status === "codexFocusNotConfirmed" ||
    step.status === "audioUnavailable" ||
    step.status === "dictationUnavailable"
  ) {
    return { label: "Needs attention", tone: "attention", message: step.message };
  }

  return { label: "Ready", tone: "ready" };
}
