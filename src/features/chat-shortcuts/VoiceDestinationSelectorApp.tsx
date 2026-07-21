import { listen } from "@tauri-apps/api/event";
import { IconArrowLeft, IconFolder } from "@tabler/icons-react";
import { useEffect, useMemo, useRef, useState } from "react";

import type { ChatDestination } from "./chatDestinationTypes";
import { hideVoiceSelector, selectVoiceDestination } from "./voiceSelectorClient";
import {
  getVoiceSelectorKeyAction,
  getVoiceSelectorNumber,
  parseVoiceSelectorOpenPayload,
  VOICE_SELECTOR_OPEN_EVENT,
  type VoiceSelectorProject,
  type VoiceSelectorSelection,
} from "./voiceSelectorEvents";

type SelectorMode = "chats" | "projects";

const MODE_STORAGE_KEY = "qolayer.voice-selector-mode.v0";

export function VoiceDestinationSelectorApp() {
  const [destinations, setDestinations] = useState<ChatDestination[]>([]);
  const [projects, setProjects] = useState<VoiceSelectorProject[]>([]);
  const [mode, setModeState] = useState<SelectorMode>(readMode);
  const [projectId, setProjectId] = useState<string>();
  const consumedRef = useRef(false);
  const selectedProject = useMemo(
    () => projects.find((project) => project.id === projectId),
    [projectId, projects],
  );

  const setMode = (next: SelectorMode) => {
    setModeState(next);
    setProjectId(undefined);
    window.localStorage.setItem(MODE_STORAGE_KEY, next);
  };

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    void listen(VOICE_SELECTOR_OPEN_EVENT, (event) => {
      const payload = parseVoiceSelectorOpenPayload(event.payload);
      if (!payload) return;
      consumedRef.current = false;
      setDestinations(payload.destinations);
      setProjects(payload.projects);
      setProjectId(undefined);
      if (mode === "projects" && payload.projects.length === 0) setMode("chats");
    }).then((next) => {
      unlisten = next;
    });
    return () => unlisten?.();
  }, [mode]);

  const choose = (selection: VoiceSelectorSelection) => {
    if (consumedRef.current) return;
    consumedRef.current = true;
    void selectVoiceDestination(selection);
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Space") event.preventDefault();
      if (event.code === "Escape") {
        event.preventDefault();
        if (mode === "projects" && selectedProject) setProjectId(undefined);
        else void hideVoiceSelector();
        return;
      }
      if (consumedRef.current) return;

      if (mode === "chats") {
        const action = getVoiceSelectorKeyAction(event.code, destinations);
        if (!action || action.kind === "cancel") return;
        event.preventDefault();
        choose(action);
        return;
      }

      const number = getVoiceSelectorNumber(event.code);
      if (!number || number > 9) return;
      event.preventDefault();
      if (selectedProject) {
        const chat = selectedProject.chats[number - 1];
        if (chat) choose({ kind: "projectChat", threadId: chat.threadId });
      } else {
        const project = projects[number - 1];
        if (project) setProjectId(project.id);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [destinations, mode, projects, selectedProject]);

  return (
    <main className="selector-shell" aria-label="Voice destination selector">
      <header className="selector-heading">
        <p className="eyebrow">Voice Flow</p>
        <div className="selector-title-row">
          {selectedProject ? (
            <button
              aria-label="Back to Projects"
              className="selector-back"
              onClick={() => setProjectId(undefined)}
              type="button"
            >
              <IconArrowLeft aria-hidden="true" size={18} stroke={1.8} />
            </button>
          ) : null}
          <h1>{selectedProject?.name ?? "Choose a chat"}</h1>
        </div>
        <p>Keep holding your Voice Flow shortcut.</p>
        {!selectedProject ? (
          <div className="selector-mode" role="tablist" aria-label="Destination view">
            <button
              aria-selected={mode === "chats"}
              onClick={() => setMode("chats")}
              role="tab"
              type="button"
            >
              Chats
            </button>
            <button
              aria-selected={mode === "projects"}
              disabled={projects.length === 0}
              onClick={() => setMode("projects")}
              role="tab"
              type="button"
            >
              Projects
            </button>
          </div>
        ) : null}
      </header>

      <div className="selector-list">
        {mode === "chats" ? (
          <ChatOptions destinations={destinations} onChoose={choose} />
        ) : selectedProject ? (
          selectedProject.chats.map((chat, index) => (
            <button
              key={chat.threadId}
              onClick={() => choose({ kind: "projectChat", threadId: chat.threadId })}
              type="button"
            >
              <IndexBadge index={index} />
              <strong title={chat.displayName}>{chat.displayName}</strong>
            </button>
          ))
        ) : (
          projects.map((project, index) => (
            <button
              className="selector-project-row"
              key={project.id}
              onClick={() => setProjectId(project.id)}
              type="button"
            >
              <IndexBadge index={index} />
              <strong title={project.name}>{project.name}</strong>
              <small>{project.chats.length} chats</small>
              <IconFolder aria-hidden="true" className="selector-row-icon" size={17} stroke={1.6} />
            </button>
          ))
        )}
      </div>
      <footer>{selectedProject ? "Esc to go back" : "Esc to cancel"}</footer>
    </main>
  );
}

function ChatOptions({
  destinations,
  onChoose,
}: {
  destinations: readonly ChatDestination[];
  onChoose: (selection: VoiceSelectorSelection) => void;
}) {
  return (
    <>
      <button onClick={() => onChoose({ kind: "current" })} type="button">
        <span>0</span>
        <strong>Current chat</strong>
      </button>
      {destinations.map((destination) => (
        <button
          key={destination.id}
          onClick={() => onChoose({ kind: "saved", destinationId: destination.id })}
          type="button"
        >
          <span>{destination.order}</span>
          <strong title={destination.displayName}>{destination.displayName}</strong>
          {destination.projectName ? <small>{destination.projectName}</small> : null}
        </button>
      ))}
    </>
  );
}

function IndexBadge({ index }: { index: number }) {
  return <span>{index < 9 ? index + 1 : "\u00b7"}</span>;
}

function readMode(): SelectorMode {
  return window.localStorage.getItem(MODE_STORAGE_KEY) === "projects" ? "projects" : "chats";
}
