import {
  IconArrowLeft,
  IconArrowDown,
  IconArrowUp,
  IconCheck,
  IconPencil,
  IconPlus,
  IconRefresh,
  IconTrash,
} from "@tabler/icons-react";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";

import { suspendWindowDismiss } from "../../shared/windowFocusGuard";
import { parseCodexThreadInput } from "../codex/deepLinks";
import { buildChatShortcutViewModel } from "./chatShortcutViewModel";
import type { ChatDestinationsState } from "./useChatDestinations";

type ChatShortcutsPanelProps = {
  state: ChatDestinationsState;
};

type ChatShortcutsView = "list" | "add";

export function ChatShortcutsPanel({ state }: ChatShortcutsPanelProps) {
  const [manualInput, setManualInput] = useState("");
  const [manualName, setManualName] = useState("");
  const [manualMessage, setManualMessage] = useState<string>();
  const [view, setView] = useState<ChatShortcutsView>("list");
  const [renamingId, setRenamingId] = useState<string>();
  const [renameValue, setRenameValue] = useState("");
  const manualNameRef = useRef<HTMLInputElement>(null);
  const model = useMemo(
    () => buildChatShortcutViewModel(state.destinations, state.recentChats),
    [state.destinations, state.recentChats],
  );

  useEffect(() => {
    if (!state.discoveryAttempted) {
      void state.refreshRecent();
    }
  }, [state]);

  useEffect(() => {
    if (view === "add") {
      manualNameRef.current?.focus();
    }
  }, [view]);

  useEffect(() => {
    if (view !== "add" && !renamingId) return;
    return suspendWindowDismiss();
  }, [renamingId, view]);

  const closeAddView = () => {
    setManualInput("");
    setManualName("");
    setManualMessage(undefined);
    setView("list");
  };

  const addManual = (event: FormEvent) => {
    event.preventDefault();
    const parsed = parseCodexThreadInput(manualInput);
    if (!parsed.ok) {
      setManualMessage(parsed.message);
      return;
    }
    state.pin({
      threadId: parsed.threadId,
      displayName: manualName.trim() || "Saved chat",
    });
    closeAddView();
  };

  if (view === "add") {
    return (
      <section className="tool-view chat-shortcuts-view chat-add-view" aria-label="Add chat">
        <header className="chat-add-heading">
          <button
            aria-label="Back to Chat shortcuts"
            className="chat-add-back"
            onClick={closeAddView}
            type="button"
          >
            <IconArrowLeft aria-hidden="true" size={20} stroke={1.7} />
          </button>
          <h1>Add chat</h1>
        </header>

        <form className="manual-chat-form" id="manual-chat-form" onSubmit={addManual}>
          <label className="manual-chat-field">
            <span>Name</span>
            <input
              className="compact-input manual-chat-input"
              onChange={(event) => setManualName(event.target.value)}
              placeholder="Optional name"
              ref={manualNameRef}
              value={manualName}
            />
          </label>

          <label className="manual-chat-field">
            <span>Chat ID</span>
            <input
              className="compact-input manual-chat-input"
              onChange={(event) => setManualInput(event.target.value)}
              placeholder="Paste chat ID"
              value={manualInput}
            />
          </label>

          <p className="manual-chat-helper">Paste the thread ID from Codex or ChatGPT.</p>
          {manualMessage ? <p className="form-message">{manualMessage}</p> : null}

          <div className="manual-chat-actions">
            <button className="manual-chat-cancel" onClick={closeAddView} type="button">
              Cancel
            </button>
            <button
              className="manual-chat-submit"
              disabled={!model.canPinMore || !manualInput.trim()}
              type="submit"
            >
              Add chat
            </button>
          </div>
        </form>
      </section>
    );
  }

  return (
    <section className="tool-view chat-shortcuts-view" aria-label="Chat shortcuts">
      <header className="chat-shortcuts-heading">
        <h1>Chat shortcuts</h1>
        <div aria-label="Chat shortcut actions" className="chat-shortcuts-actions">
          <button
            aria-label="Add chat"
            className="chat-add-button"
            onClick={() => setView("add")}
            title="Add chat"
            type="button"
          >
            <IconPlus aria-hidden="true" size={18} stroke={1.8} />
          </button>
          <button
            aria-label="Refresh recent chats"
            className="icon-action"
            disabled={state.discoveryLoading}
            onClick={() => void state.refreshRecent()}
            title="Refresh recent chats"
            type="button"
          >
            <IconRefresh aria-hidden="true" size={18} stroke={1.7} />
          </button>
        </div>
      </header>

      <div className="chat-shortcuts-scroll">
        <section className="shortcut-section" aria-labelledby="voice-destinations-title">
          <div className="shortcut-section-heading">
            <h2 id="voice-destinations-title">Voice destinations</h2>
            <span>{model.destinationRows.length}/9</span>
          </div>
          {model.destinationRows.length === 0 ? (
            <p className="shortcut-empty">Pin chats to choose a destination before dictation.</p>
          ) : (
            <div className="destination-list">
              {model.destinationRows.map((destination, index) => (
                <div className="destination-row" key={destination.id}>
                  <span className="destination-number">{destination.number}</span>
                  <div className="destination-copy">
                    {renamingId === destination.id ? (
                      <input
                        aria-label={`Rename ${destination.displayName}`}
                        autoFocus
                        className="compact-input"
                        onChange={(event) => setRenameValue(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            state.rename(destination.id, renameValue);
                            setRenamingId(undefined);
                          }
                        }}
                        value={renameValue}
                      />
                    ) : (
                      <>
                        <strong title={destination.displayName}>{destination.displayName}</strong>
                        {destination.projectName ? <span>{destination.projectName}</span> : null}
                      </>
                    )}
                  </div>
                  <div className="destination-actions">
                    <button
                      aria-label={`Move ${destination.displayName} up`}
                      disabled={index === 0}
                      onClick={() => state.move(destination.id, "up")}
                      type="button"
                    >
                      <IconArrowUp aria-hidden="true" size={16} />
                    </button>
                    <button
                      aria-label={`Move ${destination.displayName} down`}
                      disabled={index === model.destinationRows.length - 1}
                      onClick={() => state.move(destination.id, "down")}
                      type="button"
                    >
                      <IconArrowDown aria-hidden="true" size={16} />
                    </button>
                    <button
                      aria-label={`Rename ${destination.displayName}`}
                      onClick={() => {
                        if (renamingId === destination.id) {
                          state.rename(destination.id, renameValue);
                          setRenamingId(undefined);
                        } else {
                          setRenamingId(destination.id);
                          setRenameValue(destination.displayName);
                        }
                      }}
                      type="button"
                    >
                      {renamingId === destination.id ? (
                        <IconCheck aria-hidden="true" size={16} />
                      ) : (
                        <IconPencil aria-hidden="true" size={16} />
                      )}
                    </button>
                    <button
                      aria-label={`Remove ${destination.displayName}`}
                      onClick={() => state.remove(destination.id)}
                      type="button"
                    >
                      <IconTrash aria-hidden="true" size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="shortcut-section" aria-labelledby="recent-chats-title">
          <div className="shortcut-section-heading">
            <h2 id="recent-chats-title">Recent chats</h2>
            {state.discoveryLoading ? <span>Loading…</span> : null}
          </div>
          {state.discoveryMessage ? (
            <p className="shortcut-empty">{state.discoveryMessage}</p>
          ) : null}
          {!state.discoveryLoading && !state.discoveryMessage && model.recentRows.length === 0 ? (
            <p className="shortcut-empty">No recent chats found.</p>
          ) : null}
          <div className="recent-list">
            {model.recentRows.map((chat) => (
              <div className="recent-row" key={chat.threadId}>
                <div className="destination-copy">
                  <strong title={chat.title}>{chat.title}</strong>
                  {chat.projectName ? <span>{chat.projectName}</span> : null}
                </div>
                <button
                  className="pin-action"
                  disabled={chat.pinned || !model.canPinMore}
                  onClick={() =>
                    state.pin({
                      threadId: chat.threadId,
                      displayName: chat.title,
                      ...(chat.projectName ? { projectName: chat.projectName } : {}),
                    })
                  }
                  type="button"
                >
                  {chat.pinned ? "Pinned" : "Pin"}
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
