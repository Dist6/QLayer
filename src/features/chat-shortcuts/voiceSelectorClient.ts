import { invoke } from "@tauri-apps/api/core";
import { emitTo, listen } from "@tauri-apps/api/event";

import type { ChatDestination } from "./chatDestinationTypes";
import {
  parseVoiceSelectorSelection,
  VOICE_SELECTOR_OPEN_EVENT,
  VOICE_SELECTOR_SELECTION_EVENT,
  type VoiceSelectorSelection,
  type VoiceSelectorProject,
} from "./voiceSelectorEvents";

export async function showVoiceSelector(
  destinations: readonly ChatDestination[],
  projects: readonly VoiceSelectorProject[],
): Promise<void> {
  await invoke("show_voice_selector");
  await emitTo("voice-selector", VOICE_SELECTOR_OPEN_EVENT, { destinations, projects });
}

export async function hideVoiceSelector(): Promise<void> {
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
