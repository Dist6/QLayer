import {
  IconArrowLeft,
  IconCheck,
  IconFolder,
  IconPlus,
  IconRefresh,
  IconTrash,
} from "@tabler/icons-react";
import { type FormEvent, useMemo, useState } from "react";

import type { ChatDestinationsState } from "../chat-shortcuts/useChatDestinations";
import { chooseProjectFolder } from "./projectFolderClient";
import { suggestProjectChats } from "./projectChatSuggestions";
import type {
  Project,
  ProjectCandidate,
  ProjectChatLink,
  ProjectPort,
  ProjectPortRole,
} from "./projectTypes";
import { normalizeProjectName, normalizeProjectPortLabel } from "./projectValidation";

type ProjectEditorViewProps = {
  project?: Project;
  chats: ChatDestinationsState;
  onCancel: () => void;
  onSave: (candidate: ProjectCandidate) => void;
};

const PORT_ROLES: ReadonlyArray<{ value: ProjectPortRole; label: string }> = [
  { value: "frontend", label: "Frontend" },
  { value: "backend", label: "Backend" },
  { value: "fullstack", label: "Full stack" },
  { value: "database", label: "Database" },
  { value: "other", label: "Other" },
];

export function ProjectEditorView({ project, chats, onCancel, onSave }: ProjectEditorViewProps) {
  const [name, setName] = useState(project?.name ?? "");
  const [rootPath, setRootPath] = useState(project?.rootPath ?? "");
  const [rootIdentity, setRootIdentity] = useState(project?.rootIdentity ?? "");
  const [linkedChats, setLinkedChats] = useState<ProjectChatLink[]>(project?.linkedChats ?? []);
  const [ports, setPorts] = useState<ProjectPort[]>(project?.preferredPorts ?? []);
  const [message, setMessage] = useState<string>();
  const [choosingFolder, setChoosingFolder] = useState(false);
  const suggestions = useMemo(
    () => suggestProjectChats({ rootIdentity, linkedChats }, chats.destinations, chats.recentChats),
    [chats.destinations, chats.recentChats, linkedChats, rootIdentity],
  );

  const chooseFolder = async () => {
    setChoosingFolder(true);
    setMessage(undefined);
    const result = await chooseProjectFolder();
    setChoosingFolder(false);
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    if (result.value) {
      setRootPath(result.value.rootPath);
      setRootIdentity(result.value.rootIdentity);
      if (!name.trim()) setName(result.value.displayName);
    }
  };

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

  const updatePort = (id: string, update: Partial<ProjectPort>) => {
    setPorts((current) => current.map((port) => (port.id === id ? { ...port, ...update } : port)));
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const normalizedName = normalizeProjectName(name);
    if (!normalizedName || !rootPath || !rootIdentity) {
      setMessage("Choose a name and Project folder.");
      return;
    }
    if (
      ports.some(
        (port) => !normalizeProjectPortLabel(port.label) || port.port < 1 || port.port > 65_535,
      )
    ) {
      setMessage("Every preferred port needs a label and a valid port number.");
      return;
    }
    if (new Set(ports.map((port) => port.port)).size !== ports.length) {
      setMessage("Preferred ports must be unique.");
      return;
    }
    onSave({
      name: normalizedName,
      rootPath,
      rootIdentity,
      linkedChats,
      preferredPorts: ports.map((port) => ({
        ...port,
        label: normalizeProjectPortLabel(port.label),
      })),
      ...(project?.lastSelectedChatId &&
      linkedChats.some((chat) => chat.threadId === project.lastSelectedChatId)
        ? { lastSelectedChatId: project.lastSelectedChatId }
        : {}),
    });
  };

  return (
    <section className="tool-view projects-view project-editor-view">
      <header className="project-subview-heading">
        <button
          aria-label="Back to Projects"
          className="project-back"
          onClick={onCancel}
          type="button"
        >
          <IconArrowLeft aria-hidden="true" size={20} stroke={1.7} />
        </button>
        <div>
          <h1>{project ? "Edit Project" : "New Project"}</h1>
          <span>
            {project
              ? "Update its folder, chats, and ports"
              : "Connect a folder to your development work"}
          </span>
        </div>
      </header>

      <form className="project-editor-scroll" onSubmit={submit}>
        <section className="project-form-section">
          <h2>Basics</h2>
          <label className="project-field">
            <span>Name</span>
            <input
              autoFocus
              maxLength={80}
              onChange={(event) => setName(event.currentTarget.value)}
              placeholder="Project name"
              value={name}
            />
          </label>
          <div className="project-folder-field">
            <span>Folder</span>
            <button disabled={choosingFolder} onClick={() => void chooseFolder()} type="button">
              <IconFolder aria-hidden="true" size={18} stroke={1.7} />
              <span title={rootPath}>{rootPath || "Choose folder"}</span>
            </button>
          </div>
        </section>

        <section className="project-form-section">
          <header>
            <div>
              <h2>Chats</h2>
              <span>{linkedChats.length} linked</span>
            </div>
            <button
              aria-label="Refresh recent chats"
              className={chats.discoveryLoading ? "icon-action is-spinning" : "icon-action"}
              disabled={chats.discoveryLoading}
              onClick={() => void chats.refreshRecent()}
              type="button"
            >
              <IconRefresh aria-hidden="true" size={17} stroke={1.7} />
            </button>
          </header>
          <div className="project-chat-picker">
            {linkedChats.map((chat) => (
              <button key={chat.threadId} onClick={() => toggleChat(chat)} type="button">
                <IconCheck aria-hidden="true" size={17} stroke={1.8} />
                <strong>{chat.displayName}</strong>
                <span>Linked</span>
              </button>
            ))}
            {suggestions.slice(0, 12).map((chat) => (
              <button
                className={chat.matchesProject ? "is-suggested" : undefined}
                key={chat.threadId}
                onClick={() => toggleChat(chat)}
                type="button"
              >
                <span className="project-chat-add">+</span>
                <strong>{chat.displayName}</strong>
                <span>{chat.matchesProject ? "Same folder" : chat.projectName || "Available"}</span>
              </button>
            ))}
            {linkedChats.length === 0 && suggestions.length === 0 ? (
              <p>No saved or recent chats available.</p>
            ) : null}
          </div>
        </section>

        <section className="project-form-section project-ports-editor">
          <header>
            <div>
              <h2>Preferred ports</h2>
              <span>{ports.length} configured</span>
            </div>
            <button
              className="project-add-port"
              onClick={() =>
                setPorts((current) => [
                  ...current,
                  {
                    id: crypto.randomUUID(),
                    label: "",
                    role: "other",
                    port: 3000,
                    strict: true,
                  },
                ])
              }
              type="button"
            >
              <IconPlus aria-hidden="true" size={17} stroke={1.8} />
              Add port
            </button>
          </header>
          {ports.map((port) => (
            <div className="project-port-editor" key={port.id}>
              <input
                aria-label="Port label"
                maxLength={40}
                onChange={(event) => updatePort(port.id, { label: event.currentTarget.value })}
                placeholder="Label"
                value={port.label}
              />
              <select
                aria-label={`Role for ${port.label || "port"}`}
                onChange={(event) =>
                  updatePort(port.id, { role: event.currentTarget.value as ProjectPortRole })
                }
                value={port.role}
              >
                {PORT_ROLES.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
              <input
                aria-label={`Port number for ${port.label || "port"}`}
                max={65_535}
                min={1}
                onChange={(event) =>
                  updatePort(port.id, { port: Number(event.currentTarget.value) })
                }
                type="number"
                value={port.port}
              />
              <label className="project-strict-toggle">
                <input
                  checked={port.strict}
                  onChange={(event) => updatePort(port.id, { strict: event.currentTarget.checked })}
                  type="checkbox"
                />
                <span>Strict</span>
              </label>
              <button
                aria-label={`Remove ${port.label || "port"}`}
                className="icon-action"
                onClick={() => setPorts((current) => current.filter((item) => item.id !== port.id))}
                type="button"
              >
                <IconTrash aria-hidden="true" size={17} stroke={1.7} />
              </button>
            </div>
          ))}
        </section>

        {message ? (
          <p className="project-form-message" role="alert">
            {message}
          </p>
        ) : null}
        <div className="project-editor-actions">
          <button className="project-cancel" onClick={onCancel} type="button">
            Cancel
          </button>
          <button className="project-save" type="submit">
            {project ? "Save Changes" : "Save Project"}
          </button>
        </div>
      </form>
    </section>
  );
}
