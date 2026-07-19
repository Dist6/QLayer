import type { AppSettings } from "../settings/settingsTypes";
import type {
  AudioController,
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
  window: WindowController;
  keyboard: KeyboardController;
  waitAfterCodexFocus?: () => Promise<void>;
};

export type StartVoiceFlowHoldInput = StartVoiceFlowInput & {
  shouldContinue: () => boolean;
};

const CODEX_FOCUS_SETTLE_DELAY_MS = 50;
const WAITING_FOR_CODEX_MESSAGE =
  "Waiting for Codex or ChatGPT. Make sure it is open and visible, then hold Ctrl+Alt+Space again.";

export async function startVoiceFlow(input: StartVoiceFlowInput): Promise<VoiceFlowRunResult> {
  const steps: VoiceFlowStep[] = [];
  const setupResult = await prepareVoiceFlow(input, steps);

  if (setupResult.status !== "ready") {
    return setupResult;
  }

  const keyboardResult = await input.keyboard.triggerDictationShortcut(
    input.settings.codex.dictationShortcut,
  );
  if (!keyboardResult.ok && keyboardResult.reason === "notImplemented") {
    steps.push({ status: "dictationUnavailable", message: keyboardResult.message });
    await restorePreparedAudio(input.audio, steps);
    return { status: "dictationUnavailable", steps };
  } else if (!keyboardResult.ok) {
    await restorePreparedAudio(input.audio, steps);
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

export async function startVoiceFlowHold(
  input: StartVoiceFlowHoldInput,
): Promise<VoiceFlowRunResult> {
  const steps: VoiceFlowStep[] = [];
  const setupResult = await prepareVoiceFlow(input, steps);

  if (setupResult.status !== "ready") {
    return setupResult;
  }

  if (!input.shouldContinue()) {
    await restorePreparedAudio(input.audio, steps);
    steps.push({
      status: "dictationStopped",
      message: "Dictation shortcut released.",
    });

    return { status: "ready", steps };
  }

  const keyboardResult = await input.keyboard.pressDictationShortcut(
    input.settings.codex.dictationShortcut,
  );
  if (!keyboardResult.ok && keyboardResult.reason === "notImplemented") {
    steps.push({ status: "dictationUnavailable", message: keyboardResult.message });
    await restorePreparedAudio(input.audio, steps);
    return { status: "dictationUnavailable", steps };
  } else if (!keyboardResult.ok) {
    await restorePreparedAudio(input.audio, steps);
    return fail(steps, keyboardResult.message);
  } else {
    steps.push(keyboardResult.value);
  }

  if (!input.shouldContinue()) {
    const stopped = await stopVoiceFlowHold(
      input.keyboard,
      input.audio,
      input.settings.codex.dictationShortcut,
    );
    steps.push(...stopped);
    return { status: "ready", steps };
  }

  steps.push({
    status: "ready",
    message: buildReadyMessage(steps),
  });

  return { status: "ready", steps };
}

export async function stopVoiceFlowHold(
  keyboard: KeyboardController,
  audio: AudioController,
  shortcut: string,
): Promise<VoiceFlowStep[]> {
  const steps: VoiceFlowStep[] = [];
  const releaseResult = await keyboard.releaseDictationShortcut(shortcut);

  if (!releaseResult.ok) {
    if (releaseResult.reason === "notImplemented") {
      steps.push({ status: "dictationUnavailable", message: releaseResult.message });
    } else {
      steps.push({ status: "failed", message: releaseResult.message });
    }
  } else {
    steps.push(releaseResult.value);
  }

  const restoreResult = await audio.restoreAudio();
  if (!restoreResult.ok) {
    steps.push({ status: "failed", message: restoreResult.message });
  } else if (restoreResult.value.status !== "nothingToRestore") {
    steps.push(restoreResult.value);
  }

  return steps;
}

async function prepareVoiceFlow(
  input: StartVoiceFlowInput,
  steps: VoiceFlowStep[],
): Promise<VoiceFlowRunResult> {
  const audioResult = await input.audio.prepareAudio(
    input.settings.voiceFlow.audioMode,
    input.settings.voiceFlow.listeningVolumePercent,
  );

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
  steps.push({ status: "focusingCodex", message: "Looking for Codex." });

  const focusResult = await input.window.focusCodex();
  if (focusResult.ok) {
    steps.push(focusResult.value);
  }

  if (!focusResult.ok || focusResult.value.status !== "codexFocused") {
    await restorePreparedAudio(input.audio, steps);
    await input.window.showQoLayer();
    return finish("waitingForCodex", steps, {
      status: "waitingForCodex",
      message: WAITING_FOR_CODEX_MESSAGE,
    });
  }

  await (input.waitAfterCodexFocus ?? waitAfterCodexFocus)();

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

  if (steps.some((step) => step.status === "codexFocused")) {
    messages.push("Codex focused.");
  }

  if (steps.some((step) => step.status === "dictationSent")) {
    messages.push("Dictation shortcut sent.");
  } else if (steps.some((step) => step.status === "dictationStarted")) {
    messages.push("Dictation is listening.");
  } else if (steps.some((step) => step.status === "dictationUnavailable")) {
    messages.push("Dictation automation is not available.");
  }

  return messages.join(" ");
}

function waitAfterCodexFocus(): Promise<void> {
  return wait(CODEX_FOCUS_SETTLE_DELAY_MS);
}

async function restorePreparedAudio(audio: AudioController, steps: VoiceFlowStep[]): Promise<void> {
  const changedAudio = steps.some(
    (step) => step.status === "audioDucked" || step.status === "audioMuted",
  );

  if (!changedAudio) {
    return;
  }

  const restored = await audio.restoreAudio();
  if (restored.ok) {
    steps.push(restored.value);
  } else {
    steps.push({ status: "failed", message: restored.message });
  }
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, milliseconds);
  });
}
