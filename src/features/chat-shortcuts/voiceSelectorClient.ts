import { invoke } from "@tauri-apps/api/core";
import { emitTo, listen } from "@tauri-apps/api/event";

import type { ChatDestination } from "./chatDestinationTypes";
import {
  parseVoiceSelectorSelection,
  VOICE_SELECTOR_CLOSED_EVENT,
  VOICE_SELECTOR_OPEN_EVENT,
  VOICE_SELECTOR_READY_EVENT,
  VOICE_SELECTOR_SELECTION_EVENT,
  type VoiceSelectorSelection,
  type VoiceSelectorProject,
} from "./voiceSelectorEvents";

export async function showVoiceSelector(
  destinations: readonly ChatDestination[],
  projects: readonly VoiceSelectorProject[],
): Promise<void> {
  const availability = await createVoiceSelectorAvailabilityWaiter();
  let created: boolean;
  try {
    created = await invoke<boolean>("show_voice_selector");
  } catch (error) {
    availability.cancel();
    throw error;
  }

  if (created) {
    const state = await availability.promise;
    if (state === "closed") {
      await invoke("hide_voice_selector").catch(() => undefined);
      return;
    }
  } else {
    availability.cancel();
  }

  await emitTo("voice-selector", VOICE_SELECTOR_OPEN_EVENT, { destinations, projects });
}

export async function hideVoiceSelector(): Promise<void> {
  await emitTo("main", VOICE_SELECTOR_CLOSED_EVENT);
  await invoke("hide_voice_selector");
}

export async function selectVoiceDestination(selection: VoiceSelectorSelection): Promise<void> {
  await emitTo("main", VOICE_SELECTOR_SELECTION_EVENT, selection);
  await hideVoiceSelector();
}

export async function listenForVoiceSelectorSelection(
  onSelection: (selection: VoiceSelectorSelection) => void,
): Promise<() => void> {
  return listen(VOICE_SELECTOR_SELECTION_EVENT, (event) => {
    const selection = parseVoiceSelectorSelection(event.payload);
    if (selection) {
      onSelection(selection);
    }
  });
}

type VoiceSelectorAvailability = "ready" | "closed";

async function createVoiceSelectorAvailabilityWaiter(): Promise<{
  promise: Promise<VoiceSelectorAvailability>;
  cancel: () => void;
}> {
  let signal: (state: VoiceSelectorAvailability) => void = () => undefined;
  const availabilityEvent = new Promise<VoiceSelectorAvailability>((resolve) => {
    signal = resolve;
  });
  const unlistenReady = await listen(VOICE_SELECTOR_READY_EVENT, () => signal("ready"));
  const unlistenClosed = await listen(VOICE_SELECTOR_CLOSED_EVENT, () => signal("closed"));
  let timeoutId: ReturnType<typeof globalThis.setTimeout> | undefined;
  let active = true;

  const cancel = () => {
    if (!active) return;
    active = false;
    if (timeoutId !== undefined) globalThis.clearTimeout(timeoutId);
    unlistenReady();
    unlistenClosed();
  };

  const promise = new Promise<VoiceSelectorAvailability>((resolve, reject) => {
    timeoutId = globalThis.setTimeout(() => {
      cancel();
      reject(new Error("Voice destination selector did not become ready."));
    }, 5_000);
    void availabilityEvent.then((state) => {
      if (!active) return;
      cancel();
      resolve(state);
    });
  });

  return { promise, cancel };
}
