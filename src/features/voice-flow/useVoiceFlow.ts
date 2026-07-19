import { useCallback, useEffect, useRef, useState } from "react";

import type { ChatDestination } from "../chat-shortcuts/chatDestinationTypes";
import {
  hideVoiceSelector,
  listenForVoiceSelectorSelection,
  showVoiceSelector,
} from "../chat-shortcuts/voiceSelectorClient";
import type { VoiceSelectorSelection } from "../chat-shortcuts/voiceSelectorEvents";
import type { AppSettings } from "../settings/settingsTypes";
import type { VoiceFlowStep } from "./controllers";
import { audioController, keyboardController, windowController } from "./nativeControllers";
import {
  restoreVoiceFlowAudio,
  startVoiceFlow,
  startVoiceFlowHold,
  startTargetedVoiceFlowHold,
  stopVoiceFlowHold,
} from "./voiceFlowService";
import {
  beginVoiceDestinationFlow,
  consumeVoiceDestinationSelection,
  releaseVoiceDestinationFlow,
  resolveVoiceDestination,
  type VoiceDestinationPhase,
} from "./voiceDestinationFlow";

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

export function useVoiceFlow(
  settings: AppSettings,
  destinations: readonly ChatDestination[] = [],
): VoiceFlowState {
  const [status, setStatus] = useState<VoiceFlowStep>({
    status: "ready",
    message: "Ready.",
  });
  const [steps, setSteps] = useState<VoiceFlowStep[]>([]);
  const [running, setRunning] = useState(false);
  const holdRequestedRef = useRef(false);
  const phaseRef = useRef<VoiceDestinationPhase>("idle");
  const destinationsRef = useRef(destinations);
  destinationsRef.current = destinations;

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
    phaseRef.current = beginVoiceDestinationFlow(destinations.length > 0);

    if (phaseRef.current === "selecting") {
      setRunning(true);
      setStatus({
        status: "selectingChat",
        message: "Choose a chat while holding the shortcut.",
      });
      try {
        await showVoiceSelector(destinations);
      } catch {
        holdRequestedRef.current = false;
        phaseRef.current = "idle";
        setStatus({
          status: "failed",
          message: "Voice destination selector could not be shown.",
        });
      }
      setRunning(false);
      return;
    }

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
    phaseRef.current = result.status === "ready" && holdRequestedRef.current ? "listening" : "idle";
    setRunning(false);
  }, [destinations, settings]);

  const selectDestination = useCallback(
    async (selection: VoiceSelectorSelection) => {
      const transition = consumeVoiceDestinationSelection(phaseRef.current);
      if (!transition.accepted || !holdRequestedRef.current) {
        return;
      }
      phaseRef.current = transition.phase;
      const target = resolveVoiceDestination(destinationsRef.current, selection);
      if (!target) {
        holdRequestedRef.current = false;
        phaseRef.current = "idle";
        setStatus({ status: "failed", message: "That saved chat is no longer available." });
        return;
      }

      setRunning(true);
      setStatus({ status: "focusingCodex", message: "Opening the selected chat." });
      const result = await startTargetedVoiceFlowHold({
        settings,
        audio: audioController,
        window: windowController,
        keyboard: keyboardController,
        shouldContinue: () => holdRequestedRef.current,
        ...(target.kind === "saved" ? { threadId: target.threadId } : {}),
      });
      setSteps(result.steps);
      setStatus(result.steps.at(-1) ?? { status: result.status, message: "Voice Flow finished." });
      phaseRef.current =
        result.status === "ready" && holdRequestedRef.current ? "listening" : "idle";
      setRunning(false);
    },
    [settings],
  );

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let cancelled = false;
    void listenForVoiceSelectorSelection((selection) => void selectDestination(selection)).then(
      (next) => {
        if (cancelled) {
          next();
        } else {
          unlisten = next;
        }
      },
    );
    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, [selectDestination]);

  const stopHold = useCallback(async () => {
    if (!holdRequestedRef.current) {
      return;
    }

    holdRequestedRef.current = false;
    const release = releaseVoiceDestinationFlow(phaseRef.current);
    phaseRef.current = release.phase;
    if (release.cancelledSelection) {
      await hideVoiceSelector().catch(() => undefined);
      setStatus({ status: "ready", message: "Voice Flow cancelled." });
      setRunning(false);
      return;
    }
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
