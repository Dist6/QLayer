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
  const audioResult = input.audio.prepareAudio(input.settings.voiceFlow.audioMode);

  if (!audioResult.ok) {
    return fail(steps, audioResult.message);
  }

  steps.push(audioResult.value);
  steps.push({ status: "openingCodex", message: "Opening Codex." });

  const codexResult = await input.codex.openCodex();
  if (!codexResult.ok) {
    return fail(steps, codexResult.message);
  }

  const keyboardResult = input.keyboard.triggerDictationShortcut(
    input.settings.codex.dictationShortcut,
  );
  if (!keyboardResult.ok && keyboardResult.reason === "notImplemented") {
    steps.push({ status: "dictationUnavailable", message: keyboardResult.message });
  } else if (!keyboardResult.ok) {
    return fail(steps, keyboardResult.message);
  } else {
    steps.push(keyboardResult.value);
  }

  steps.push({ status: "ready", message: "Voice Flow is ready." });

  return { status: "ready", steps };
}

export async function restoreVoiceFlowAudio(audio: AudioController): Promise<VoiceFlowStep> {
  const result = audio.restoreAudio();

  if (!result.ok) {
    if (result.reason === "notImplemented") {
      return { status: "audioUnavailable", message: result.message };
    }

    return { status: "failed", message: result.message };
  }

  return result.value;
}

function fail(steps: VoiceFlowStep[], message: string): VoiceFlowRunResult {
  const failedStep: VoiceFlowStep = { status: "failed", message };

  return { status: "failed", steps: [...steps, failedStep] };
}
