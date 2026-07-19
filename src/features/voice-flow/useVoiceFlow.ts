import { useCallback, useRef, useState } from "react";

import type { AppSettings } from "../settings/settingsTypes";
import type { VoiceFlowStep } from "./controllers";
import { audioController, keyboardController, windowController } from "./nativeControllers";
import {
  restoreVoiceFlowAudio,
  startVoiceFlow,
  startVoiceFlowHold,
  stopVoiceFlowHold,
} from "./voiceFlowService";

export type VoiceFlowState = {
  status: VoiceFlowStep;
  steps: VoiceFlowStep[];
  running: boolean;
  start: () => Promise<void>;
  startHold: () => Promise<void>;
  stopHold: () => Promise<void>;
  restore: () => Promise<void>;
  reportMessage: (step: VoiceFlowStep) => void;
};

export function useVoiceFlow(settings: AppSettings): VoiceFlowState {
  const [status, setStatus] = useState<VoiceFlowStep>({
    status: "ready",
    message: "Ready.",
  });
  const [steps, setSteps] = useState<VoiceFlowStep[]>([]);
  const [running, setRunning] = useState(false);
  const holdRequestedRef = useRef(false);

  const start = useCallback(async () => {
    setRunning(true);
    setStatus({ status: "focusingCodex", message: "Starting Voice Flow." });

    const result = await startVoiceFlow({
      settings,
      audio: audioController,
      window: windowController,
      keyboard: keyboardController,
    });

    setSteps(result.steps);
    setStatus(result.steps.at(-1) ?? { status: result.status, message: "Voice Flow finished." });
    setRunning(false);
  }, [settings]);

  const restore = useCallback(async () => {
    const restored = await restoreVoiceFlowAudio(audioController);
    setStatus(restored);
    setSteps((current) => [...current, restored]);
  }, []);

  const startHold = useCallback(async () => {
    if (holdRequestedRef.current) {
      return;
    }

    holdRequestedRef.current = true;
    setRunning(true);
    setStatus({ status: "focusingCodex", message: "Starting Voice Flow." });

    const result = await startVoiceFlowHold({
      settings,
      audio: audioController,
      window: windowController,
      keyboard: keyboardController,
      shouldContinue: () => holdRequestedRef.current,
    });

    setSteps(result.steps);
    setStatus(result.steps.at(-1) ?? { status: result.status, message: "Voice Flow finished." });
    setRunning(false);
  }, [settings]);

  const stopHold = useCallback(async () => {
    if (!holdRequestedRef.current) {
      return;
    }

    holdRequestedRef.current = false;
    const stopped = await stopVoiceFlowHold(
      keyboardController,
      audioController,
      settings.codex.dictationShortcut,
    );
    const lastStep = stopped.at(-1);
    if (lastStep) {
      setStatus(lastStep);
    }
    setSteps((current) => [...current, ...stopped]);
  }, [settings.codex.dictationShortcut]);

  const reportMessage = useCallback((step: VoiceFlowStep) => {
    setStatus(step);
    setSteps((current) => [...current, step]);
  }, []);

  return { status, steps, running, start, startHold, stopHold, restore, reportMessage };
}
