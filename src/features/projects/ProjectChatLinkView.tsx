import { IconArrowLeft, IconCheck, IconPlus, IconRefresh } from "@tabler/icons-react";
import { type FormEvent, useMemo, useState } from "react";

import type { ChatDestinationsState } from "../chat-shortcuts/useChatDestinations";
import { parseCodexThreadInput } from "../codex/deepLinks";
import { suggestProjectChats } from "./projectChatSuggestions";
import type { Project, ProjectChatLink } from "./projectTypes";

type ProjectChatLinkViewProps = {
  project: Project;
  chats: ChatDestinationsState;
  onCancel: () => void;
  onSave: (linkedChats: ProjectChatLink[]) => void;
};

export function ProjectChatLinkView({
  project,
  chats,
  onCancel,
  onSave,
}: ProjectChatLinkViewProps) {
  const [linkedChats, setLinkedChats] = useState<ProjectChatLink[]>(project.linkedChats);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualName, setManualName] = useState("");
  const [manualId, setManualId] = useState("");
  const [manualMessage, setManualMessage] = useState<string>();
  const suggestions = useMemo(
    () =>
      suggestProjectChats(
        { rootIdentity: project.rootIdentity, linkedChats },
        chats.destinations,
        chats.recentChats,
      ),
    [chats.destinations, chats.recentChats, linkedChats, project.rootIdentity],
  );

  const toggleChat = (chat: { threadId: string; displayName: string }) => {
    setLinkedChats((current) =>
      current.some((linked) => linked.threadId === chat.threadId)
        ? current.filter((linked) => linked.threadId !== chat.threadId)
        : [
            ...current,
            {
              threadId: chat.threadId,
              displayName: chat.displayName,
              linkedAt: new Date().toISOString(),
            },
          ],
    );
  };

  const addManual = (event: FormEvent) => {
    event.preventDefault();
    const parsed = parseCodexThreadInput(manualId);
    if (!parsed.ok) {
      setManualMessage(parsed.message);
      return;
    }
    if (!linkedChats.some((chat) => chat.threadId === parsed.threadId)) {
      setLinkedChats((current) => [
        ...current,
        {
          threadId: parsed.threadId,
          displayName: manualName.trim() || "Linked chat",
          linkedAt: new Date().toISOString(),
        },
      ]);
    }
    setManualName("");
    setManualId("");
    setManualMessage(undefined);
    setManualOpen(false);
  };

  return (
    <section className="tool-view projects-view project-chat-link-view">
      <header className="project-subview-heading">
        <button
          aria-label="Back to Project"
          className="project-back"
          onClick={onCancel}
          type="button"
        >
          <IconArrowLeft aria-hidden="true" size={20} stroke={1.7} />
        </button>
        <div>
          <h1>Link chats</h1>
          <span>{project.name}</span>
        </div>
      </header>

      <div className="project-chat-link-scroll">
        <div className="project-chat-link-intro">
          <p>Choose recent Codex chats or chats saved in Chat shortcuts.</p>
          <button
            disabled={chats.discoveryLoading}
            onClick={() => void chats.refreshRecent()}
            type="button"
          >
            <IconRefresh aria-hidden="true" size={16} stroke={1.7} />
            Refresh
          </button>
        </div>

        <div className="project-chat-link-list">
          {linkedChats.map((chat) => (
            <button
              aria-pressed="true"
              key={chat.threadId}
              onClick={() => toggleChat(chat)}
              type="button"
            >
              <span className="project-chat-selection is-selected">
                <IconCheck aria-hidden="true" size={15} stroke={2} />
              </span>
              <strong>{chat.displayName}</strong>
              <small>Linked</small>
            </button>
          ))}
          {suggestions.map((chat) => (
            <button
              aria-pressed="false"
              key={chat.threadId}
              onClick={() => toggleChat(chat)}
              type="button"
            >
              <span className="project-chat-selection">
                <IconPlus aria-hidden="true" size={15} stroke={1.8} />
              </span>
              <strong>{chat.displayName}</strong>
              <small>
                {chat.matchesProject
                  ? "Same folder"
                  : chat.source === "recent"
                    ? "Recent"
                    : "Chat shortcut"}
              </small>
            </button>
          ))}
        </div>

        {linkedChats.length === 0 && suggestions.length === 0 ? (
          <div className="project-chat-link-empty">
            <strong>No chats found.</strong>
            <span>Refresh recent chats or add a Codex chat ID below.</span>
          </div>
        ) : null}

        <div className={manualOpen ? "project-manual-chat is-open" : "project-manual-chat"}>
          <button
            className="project-manual-chat-toggle"
            onClick={() => setManualOpen(!manualOpen)}
            type="button"
          >
            <IconPlus aria-hidden="true" size={17} stroke={1.8} />
            Add by ID
          </button>
          <div className="project-manual-chat-disclosure">
            <form onSubmit={addManual}>
              <label>
                <span>Name</span>
                <input
                  onChange={(event) => setManualName(event.currentTarget.value)}
                  placeholder="Optional name"
                  value={manualName}
                />
              </label>
              <label>
                <span>Chat ID</span>
                <input
                  onChange={(event) => setManualId(event.currentTarget.value)}
                  placeholder="Paste chat ID"
                  value={manualId}
                />
              </label>
              {manualMessage ? <p role="alert">{manualMessage}</p> : null}
              <button disabled={!manualId.trim()} type="submit">
                Add chat
              </button>
            </form>
          </div>
        </div>
      </div>

      <footer className="project-chat-link-actions">
        <button onClick={onCancel} type="button">
          Cancel
        </button>
        <button onClick={() => onSave(linkedChats)} type="button">
          Save links
        </button>
      </footer>
    </section>
  );
}
