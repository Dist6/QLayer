import { useCallback, useState } from "react";

import type { AppSettings } from "../settings/settingsTypes";
import type { VoiceFlowStep } from "./controllers";
import { audioController, codexController, keyboardController } from "./nativeControllers";
import { restoreVoiceFlowAudio, startVoiceFlow } from "./voiceFlowService";

export type VoiceFlowState = {
  status: VoiceFlowStep;
  steps: VoiceFlowStep[];
  running: boolean;
  start: () => Promise<void>;
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

  const start = useCallback(async () => {
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
  }, [settings]);

  const restore = useCallback(async () => {
    const restored = await restoreVoiceFlowAudio(audioController);
    setStatus(restored);
    setSteps((current) => [...current, restored]);
  }, []);

  const reportMessage = useCallback((step: VoiceFlowStep) => {
    setStatus(step);
    setSteps((current) => [...current, step]);
  }, []);

  return { status, steps, running, start, restore, reportMessage };
}
