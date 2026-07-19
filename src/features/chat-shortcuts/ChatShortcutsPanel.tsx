import {
  IconArrowDown,
  IconArrowUp,
  IconCheck,
  IconPencil,
  IconPlus,
  IconRefresh,
  IconTrash,
} from "@tabler/icons-react";
import { type FormEvent, useEffect, useMemo, useState } from "react";

import { parseCodexThreadInput } from "../codex/deepLinks";
import { buildChatShortcutViewModel } from "./chatShortcutViewModel";
import type { ChatDestinationsState } from "./useChatDestinations";

type ChatShortcutsPanelProps = {
  state: ChatDestinationsState;
};

export function ChatShortcutsPanel({ state }: ChatShortcutsPanelProps) {
  const [manualInput, setManualInput] = useState("");
  const [manualName, setManualName] = useState("");
  const [manualMessage, setManualMessage] = useState<string>();
  const [renamingId, setRenamingId] = useState<string>();
  const [renameValue, setRenameValue] = useState("");
  const model = useMemo(
    () => buildChatShortcutViewModel(state.destinations, state.recentChats),
    [state.destinations, state.recentChats],
  );

  useEffect(() => {
    if (!state.discoveryAttempted) {
      void state.refreshRecent();
    }
  }, [state]);

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
    setManualInput("");
    setManualName("");
    setManualMessage(undefined);
  };

  return (
    <section className="tool-view chat-shortcuts-view" aria-label="Chat shortcuts">
      <header className="chat-shortcuts-heading">
        <div>
          <p className="eyebrow">Voice Flow</p>
          <h1>Chat shortcuts</h1>
        </div>
        <button
          aria-label="Refresh recent chats"
          className="icon-action"
          disabled={state.discoveryLoading}
          onClick={() => void state.refreshRecent()}
          title="Refresh recent chats"
          type="button"
        >
          <IconRefresh aria-hidden="true" size={16} stroke={1.7} />
        </button>
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
                      <IconArrowUp aria-hidden="true" size={13} />
                    </button>
                    <button
                      aria-label={`Move ${destination.displayName} down`}
                      disabled={index === model.destinationRows.length - 1}
                      onClick={() => state.move(destination.id, "down")}
                      type="button"
                    >
                      <IconArrowDown aria-hidden="true" size={13} />
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
                        <IconCheck aria-hidden="true" size={13} />
                      ) : (
                        <IconPencil aria-hidden="true" size={13} />
                      )}
                    </button>
                    <button
                      aria-label={`Remove ${destination.displayName}`}
                      onClick={() => state.remove(destination.id)}
                      type="button"
                    >
                      <IconTrash aria-hidden="true" size={13} />
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

        <section className="shortcut-section" aria-labelledby="manual-chat-title">
          <div className="shortcut-section-heading">
            <h2 id="manual-chat-title">Add manually</h2>
          </div>
          <form className="manual-chat-form" onSubmit={addManual}>
            <input
              aria-label="Chat name"
              className="compact-input"
              onChange={(event) => setManualName(event.target.value)}
              placeholder="Name (optional)"
              value={manualName}
            />
            <div className="manual-chat-link-row">
              <input
                aria-label="Codex chat ID or link"
                className="compact-input"
                onChange={(event) => setManualInput(event.target.value)}
                placeholder="Chat ID or codex:// link"
                value={manualInput}
              />
              <button
                aria-label="Add chat destination"
                className="icon-action"
                disabled={!model.canPinMore || !manualInput.trim()}
                type="submit"
              >
                <IconPlus aria-hidden="true" size={16} stroke={1.7} />
              </button>
            </div>
            {manualMessage ? <p className="form-message">{manualMessage}</p> : null}
          </form>
        </section>
      </div>
    </section>
  );
}
