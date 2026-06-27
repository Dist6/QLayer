import type { AppSettings } from "../settings/settingsTypes";
import type {
  AudioController,
  CodexController,
  KeyboardController,
  VoiceFlowStep,
} from "./controllers";

export type VoiceFlowRunResult = {
  status: VoiceFlowStep["status"];
  steps: VoiceFlowStep[];
};

export type StartVoiceFlowInput = {
  settings: AppSettings;
  audio: AudioController;
  codex: CodexController;
  keyboard: KeyboardController;
};

export async function startVoiceFlow(input: StartVoiceFlowInput): Promise<VoiceFlowRunResult> {
  const steps: VoiceFlowStep[] = [];
  const audioResult = await input.audio.prepareAudio(input.settings.voiceFlow.audioMode);

  if (!audioResult.ok) {
    if (audioResult.reason === "notImplemented") {
      return finish("failed", steps, {
        status: "audioUnavailable",
        message: audioResult.message,
      });
    }

    return fail(steps, audioResult.message);
  }

  steps.push(audioResult.value);
  steps.push({ status: "openingCodex", message: "Opening Codex." });

  const codexResult = await input.codex.openCodex();
  if (!codexResult.ok) {
    return fail(steps, codexResult.message);
  }

  steps.push({ status: "codexOpened", message: "Codex opened." });

  const keyboardResult = await input.keyboard.triggerDictationShortcut(
    input.settings.codex.dictationShortcut,
  );
  if (!keyboardResult.ok && keyboardResult.reason === "notImplemented") {
    steps.push({ status: "dictationUnavailable", message: keyboardResult.message });
  } else if (!keyboardResult.ok) {
    return fail(steps, keyboardResult.message);
  } else {
    steps.push(keyboardResult.value);
  }

  steps.push({
    status: "ready",
    message: buildReadyMessage(steps),
  });

  return { status: "ready", steps };
}

export async function restoreVoiceFlowAudio(audio: AudioController): Promise<VoiceFlowStep> {
  const result = await audio.restoreAudio();

  if (!result.ok) {
    if (result.reason === "notImplemented") {
      return { status: "audioUnavailable", message: result.message };
    }

    return { status: "failed", message: result.message };
  }

  return result.value;
}

function fail(steps: VoiceFlowStep[], message: string): VoiceFlowRunResult {
  return finish("failed", steps, { status: "failed", message });
}

function finish(
  status: VoiceFlowRunResult["status"],
  steps: VoiceFlowStep[],
  step: VoiceFlowStep,
): VoiceFlowRunResult {
  return { status, steps: [...steps, step] };
}

function buildReadyMessage(steps: VoiceFlowStep[]): string {
  const messages: string[] = [];

  if (steps.some((step) => step.status === "audioDucked")) {
    messages.push("Audio lowered.");
  } else if (steps.some((step) => step.status === "audioMuted")) {
    messages.push("Audio muted.");
  }

  messages.push("Codex opened.");

  if (steps.some((step) => step.status === "dictationUnavailable")) {
    messages.push("Dictation automation is not implemented yet.");
  }

  return messages.join(" ");
}
