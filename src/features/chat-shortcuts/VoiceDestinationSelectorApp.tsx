import { listen } from "@tauri-apps/api/event";
import { useEffect, useRef, useState } from "react";

import type { ChatDestination } from "./chatDestinationTypes";
import { hideVoiceSelector, selectVoiceDestination } from "./voiceSelectorClient";
import {
  getVoiceSelectorKeyAction,
  parseVoiceSelectorOpenPayload,
  VOICE_SELECTOR_OPEN_EVENT,
  type VoiceSelectorSelection,
} from "./voiceSelectorEvents";

export function VoiceDestinationSelectorApp() {
  const [destinations, setDestinations] = useState<ChatDestination[]>([]);
  const consumedRef = useRef(false);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    void listen(VOICE_SELECTOR_OPEN_EVENT, (event) => {
      const payload = parseVoiceSelectorOpenPayload(event.payload);
      if (payload) {
        consumedRef.current = false;
        setDestinations(payload.destinations);
      }
    }).then((next) => {
      unlisten = next;
    });
    return () => unlisten?.();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Space") {
        event.preventDefault();
      }
      const action = getVoiceSelectorKeyAction(event.code, destinations);
      if (!action || consumedRef.current) {
        return;
      }
      event.preventDefault();
      consumedRef.current = true;
      if (action.kind === "cancel") {
        void hideVoiceSelector();
      } else {
        void selectVoiceDestination(action);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [destinations]);

  const choose = (selection: VoiceSelectorSelection) => {
    if (consumedRef.current) {
      return;
    }
    consumedRef.current = true;
    void selectVoiceDestination(selection);
  };

  return (
    <main className="selector-shell" aria-label="Voice destination selector">
      <header className="selector-heading">
        <p className="eyebrow">Voice Flow</p>
        <h1>Choose a chat</h1>
        <p>Keep holding Ctrl+Alt+Space.</p>
      </header>
      <div className="selector-list">
        <button onClick={() => choose({ kind: "current" })} type="button">
          <span>0</span>
          <strong>Current chat</strong>
        </button>
        {destinations.map((destination) => (
          <button
            key={destination.id}
            onClick={() => choose({ kind: "saved", destinationId: destination.id })}
            type="button"
          >
            <span>{destination.order}</span>
            <strong title={destination.displayName}>{destination.displayName}</strong>
            {destination.projectName ? <small>{destination.projectName}</small> : null}
          </button>
        ))}
      </div>
      <footer>Esc to cancel</footer>
    </main>
  );
}
