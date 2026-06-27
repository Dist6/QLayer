import type { AppSettings } from "../settings/settingsTypes";
import type {
  AudioController,
  CodexController,
  KeyboardController,
  VoiceFlowStep,
  WindowController,
} from "./controllers";

export type VoiceFlowRunResult = {
  status: VoiceFlowStep["status"];
  steps: VoiceFlowStep[];
};

export type StartVoiceFlowInput = {
  settings: AppSettings;
  audio: AudioController;
  codex: CodexController;
  window: WindowController;
  keyboard: KeyboardController;
  waitAfterCodexOpen?: () => Promise<void>;
  waitAfterCodexFocus?: () => Promise<void>;
};

const CODEX_OPEN_DELAY_MS = 600;
const CODEX_FOCUS_SETTLE_DELAY_MS = 250;

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
  await (input.waitAfterCodexOpen ?? waitAfterCodexOpen)();

  const focusResult = await input.window.focusCodex();
  if (!focusResult.ok) {
    steps.push({
      status: "codexFocusNotConfirmed",
      message: "Codex opened, but focus could not be confirmed.",
    });
  } else {
    steps.push(focusResult.value);
  }
  await (input.waitAfterCodexFocus ?? waitAfterCodexFocus)();

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

  if (steps.some((step) => step.status === "codexFocused")) {
    messages.push("Codex focused.");
  } else if (steps.some((step) => step.status === "codexFocusNotConfirmed")) {
    messages.push("Codex opened, but focus could not be confirmed.");
  }

  if (steps.some((step) => step.status === "dictationSent")) {
    messages.push("Dictation shortcut sent.");
  } else if (steps.some((step) => step.status === "dictationUnavailable")) {
    messages.push("Dictation automation is not available.");
  }

  return messages.join(" ");
}

function waitAfterCodexOpen(): Promise<void> {
  return wait(CODEX_OPEN_DELAY_MS);
}

function waitAfterCodexFocus(): Promise<void> {
  return wait(CODEX_FOCUS_SETTLE_DELAY_MS);
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, milliseconds);
  });
}
