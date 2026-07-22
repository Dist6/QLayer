import {
  IconArrowLeft,
  IconChevronRight,
  IconDots,
  IconExternalLink,
  IconFolderPlus,
  IconMessages,
  IconPencil,
  IconPlus,
  IconRefresh,
  IconTrash,
} from "@tabler/icons-react";
import { invoke } from "@tauri-apps/api/core";
import { type MouseEvent as ReactMouseEvent, useEffect, useRef, useState } from "react";

import { suspendWindowDismiss } from "../../shared/windowFocusGuard";
import type { ChatDestinationsState } from "../chat-shortcuts/useChatDestinations";
import { buildCodexThreadLink } from "../codex/deepLinks";
import type { LocalhostAutoRefreshSeconds } from "../settings/settingsTypes";
import { useLocalhostServers } from "../localhost-manager/useLocalhostServers";
import { ProjectChatLinkView } from "./ProjectChatLinkView";
import { ProjectEditorView } from "./ProjectEditorView";
import {
  createProjectPortFromServer,
  getDetectedProjectServers,
  type DetectedProjectServers,
} from "./projectDetectedPorts";
import { deriveProjectPortStates, type ProjectPortState } from "./projectLocalhostStatus";
import type { Project } from "./projectTypes";
import type { ProjectsState } from "./useProjects";

type ProjectsPanelProps = {
  state: ProjectsState;
  chats: ChatDestinationsState;
  autoRefreshSeconds: LocalhostAutoRefreshSeconds;
};

type ProjectsView =
  | { kind: "list" }
  | { kind: "detail"; projectId: string }
  | { kind: "create" }
  | { kind: "edit"; projectId: string }
  | { kind: "linkChats"; projectId: string };

export function ProjectsPanel({ state, chats, autoRefreshSeconds }: ProjectsPanelProps) {
  const [view, setView] = useState<ProjectsView>({ kind: "list" });
  const localhost = useLocalhostServers(autoRefreshSeconds);

  useEffect(() => {
    if (!chats.discoveryAttempted) void chats.refreshRecent();
  }, [chats]);

  useEffect(() => {
    if (view.kind === "list" || view.kind === "detail") return;
    return suspendWindowDismiss();
  }, [view.kind]);

  const selectedProject =
    view.kind === "detail" || view.kind === "edit" || view.kind === "linkChats"
      ? state.projects.find((project) => project.id === view.projectId)
      : undefined;

  useEffect(() => {
    if (
      (view.kind === "detail" || view.kind === "edit" || view.kind === "linkChats") &&
      !selectedProject
    ) {
      setView({ kind: "list" });
    }
  }, [selectedProject, view.kind]);

  if (view.kind === "create") {
    return (
      <ProjectEditorView
        chats={chats}
        onCancel={() => setView({ kind: "list" })}
        onSave={(candidate) => {
          state.create(candidate);
          setView({ kind: "list" });
        }}
      />
    );
  }

  if (view.kind === "edit" && selectedProject) {
    return (
      <ProjectEditorView
        chats={chats}
        onCancel={() => setView({ kind: "detail", projectId: selectedProject.id })}
        onSave={(candidate) => {
          state.update(selectedProject.id, candidate);
          setView({ kind: "detail", projectId: selectedProject.id });
        }}
        project={selectedProject}
      />
    );
  }

  if (view.kind === "linkChats" && selectedProject) {
    return (
      <ProjectChatLinkView
        chats={chats}
        onCancel={() => setView({ kind: "detail", projectId: selectedProject.id })}
        onSave={(linkedChats) => {
          state.update(selectedProject.id, {
            name: selectedProject.name,
            rootPath: selectedProject.rootPath,
            rootIdentity: selectedProject.rootIdentity,
            linkedChats,
            preferredPorts: selectedProject.preferredPorts,
            ...(selectedProject.lastSelectedChatId &&
            linkedChats.some((chat) => chat.threadId === selectedProject.lastSelectedChatId)
              ? { lastSelectedChatId: selectedProject.lastSelectedChatId }
              : {}),
          });
          setView({ kind: "detail", projectId: selectedProject.id });
        }}
        project={selectedProject}
      />
    );
  }

  if (view.kind === "detail" && selectedProject) {
    const detectedServers = getDetectedProjectServers(selectedProject, localhost.snapshot);
    return (
      <ProjectDetailView
        detectedServers={detectedServers}
        localhostError={localhost.error}
        onAddDetectedServer={(server) =>
          state.update(selectedProject.id, {
            name: selectedProject.name,
            rootPath: selectedProject.rootPath,
            rootIdentity: selectedProject.rootIdentity,
            linkedChats: selectedProject.linkedChats,
            preferredPorts: [
              ...selectedProject.preferredPorts,
              createProjectPortFromServer(server),
            ],
            ...(selectedProject.lastSelectedChatId
              ? { lastSelectedChatId: selectedProject.lastSelectedChatId }
              : {}),
          })
        }
        onBack={() => setView({ kind: "list" })}
        onDelete={() => {
          state.remove(selectedProject.id);
          setView({ kind: "list" });
        }}
        onEdit={() => setView({ kind: "edit", projectId: selectedProject.id })}
        onLinkChats={() => setView({ kind: "linkChats", projectId: selectedProject.id })}
        onOpenChat={(threadId) => void openProjectChat(threadId)}
        onRefresh={() => void localhost.refresh()}
        portStates={deriveProjectPortStates(
          selectedProject,
          localhost.snapshot,
          localhost.refreshing,
        )}
        project={selectedProject}
        refreshing={localhost.refreshing}
      />
    );
  }

  return (
    <ProjectListView
      loading={localhost.loading}
      onCreate={() => setView({ kind: "create" })}
      onOpen={(projectId) => setView({ kind: "detail", projectId })}
      projects={state.projects}
      snapshot={localhost.snapshot}
      warning={state.warning}
    />
  );
}

export function ProjectListView({
  projects,
  snapshot,
  loading,
  warning,
  onCreate,
  onOpen,
}: {
  projects: readonly Project[];
  snapshot: ReturnType<typeof useLocalhostServers>["snapshot"];
  loading: boolean;
  warning?: string;
  onCreate: () => void;
  onOpen: (projectId: string) => void;
}) {
  return (
    <section className="tool-view projects-view project-list-view">
      <header className="projects-heading">
        <div>
          <h1>Projects</h1>
          <span>
            {projects.length} {projects.length === 1 ? "project" : "projects"}
          </span>
        </div>
        <button
          aria-label="New Project"
          className="project-new"
          onClick={onCreate}
          title="New Project"
          type="button"
        >
          <IconPlus aria-hidden="true" size={20} stroke={1.8} />
        </button>
      </header>

      <div className="projects-scroll">
        {warning ? (
          <p className="projects-warning" role="alert">
            {warning}
          </p>
        ) : null}
        {projects.length === 0 ? (
          <div className="projects-empty">
            <IconFolderPlus aria-hidden="true" size={24} stroke={1.5} />
            <strong>No projects yet.</strong>
            <span>Connect a folder, its chats, and preferred ports.</span>
            <button onClick={onCreate} type="button">
              New Project
            </button>
          </div>
        ) : (
          <div className="project-list">
            {projects.map((project) => {
              const states = deriveProjectPortStates(project, snapshot, loading);
              const running = [...states.values()].filter(
                (state) => state.kind === "running",
              ).length;
              return (
                <button
                  className="project-row"
                  key={project.id}
                  onClick={() => onOpen(project.id)}
                  type="button"
                >
                  <div className="project-row-copy">
                    <strong>{project.name}</strong>
                    <span title={project.rootPath}>{shortProjectPath(project.rootPath)}</span>
                    <small>
                      {project.linkedChats.length}{" "}
                      {project.linkedChats.length === 1 ? "chat" : "chats"} ·{" "}
                      {project.preferredPorts.length === 0
                        ? "No servers"
                        : `${running}/${project.preferredPorts.length} running`}
                    </small>
                  </div>
                  {project.preferredPorts.length > 0 ? (
                    <div
                      aria-label={`${running} of ${project.preferredPorts.length} ports running`}
                      className="project-port-dots"
                    >
                      {project.preferredPorts.slice(0, 4).map((port) => (
                        <span
                          className={`is-${states.get(port.id)?.kind ?? "missing"}`}
                          key={port.id}
                        />
                      ))}
                    </div>
                  ) : null}
                  <IconChevronRight aria-hidden="true" size={19} stroke={1.7} />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

function ProjectDetailView({
  project,
  portStates,
  detectedServers,
  refreshing,
  localhostError,
  onAddDetectedServer,
  onBack,
  onEdit,
  onLinkChats,
  onDelete,
  onOpenChat,
  onRefresh,
}: {
  project: Project;
  portStates: ReadonlyMap<string, ProjectPortState>;
  detectedServers: DetectedProjectServers;
  refreshing: boolean;
  localhostError: string | null;
  onAddDetectedServer: (server: DetectedProjectServers["available"][number]) => void;
  onBack: () => void;
  onEdit: () => void;
  onLinkChats: () => void;
  onDelete: () => void;
  onOpenChat: (threadId: string) => void;
  onRefresh: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const running = [...portStates.values()].filter((state) => state.kind === "running").length;

  useEffect(() => {
    if (!menuOpen) return;

    const releaseDismiss = suspendWindowDismiss();
    const closeFromInsideApp = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (menuButtonRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setMenuOpen(false);
    };
    const closeWithKeyboard = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setMenuOpen(false);
      menuButtonRef.current?.focus();
    };

    document.addEventListener("pointerdown", closeFromInsideApp, true);
    document.addEventListener("keydown", closeWithKeyboard);
    return () => {
      releaseDismiss();
      document.removeEventListener("pointerdown", closeFromInsideApp, true);
      document.removeEventListener("keydown", closeWithKeyboard);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!confirmDelete) return;
    return suspendWindowDismiss();
  }, [confirmDelete]);

  const closeMenu = (event: ReactMouseEvent) => {
    event.stopPropagation();
    setMenuOpen(false);
  };

  return (
    <section className="tool-view projects-view project-detail-view">
      <header className="project-detail-heading">
        <button
          aria-label="Back to Projects"
          className="project-back"
          onClick={onBack}
          type="button"
        >
          <IconArrowLeft aria-hidden="true" size={20} stroke={1.7} />
        </button>
        <div>
          <div>
            <h1>{project.name}</h1>
            <span>
              {running}/{project.preferredPorts.length} running
            </span>
          </div>
          <small title={project.rootPath}>{project.rootPath}</small>
        </div>
        <div className="project-menu-wrap">
          <button
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            aria-label="Project actions"
            className="icon-action"
            onClick={() => setMenuOpen((current) => !current)}
            ref={menuButtonRef}
            type="button"
          >
            <IconDots aria-hidden="true" size={20} stroke={1.8} />
          </button>
          {menuOpen ? (
            <div className="project-menu" ref={menuRef} role="menu">
              <button
                onClick={(event) => {
                  closeMenu(event);
                  onEdit();
                }}
                role="menuitem"
                type="button"
              >
                <IconPencil aria-hidden="true" size={17} stroke={1.7} /> Edit
              </button>
              <button
                className="is-danger"
                onClick={(event) => {
                  closeMenu(event);
                  setConfirmDelete(true);
                }}
                role="menuitem"
                type="button"
              >
                <IconTrash aria-hidden="true" size={17} stroke={1.7} /> Delete
              </button>
            </div>
          ) : null}
        </div>
      </header>

      <div className="project-detail-scroll">
        <section className="project-detail-section">
          <header>
            <h2>Localhost</h2>
            <button
              aria-label="Refresh localhost status"
              className={
                refreshing ? "project-refresh-action is-spinning" : "project-refresh-action"
              }
              disabled={refreshing}
              onClick={onRefresh}
              title="Check configured ports again"
              type="button"
            >
              <IconRefresh aria-hidden="true" size={16} stroke={1.7} />
              Refresh
            </button>
          </header>
          <p className="project-section-help">
            Add a detected development server or compare it with this Project's configured ports.
          </p>
          <DetectedServerPicker
            detected={detectedServers}
            onAdd={onAddDetectedServer}
            refreshing={refreshing}
          />
          {project.preferredPorts.length === 0 ? (
            <p className="project-section-empty">No preferred ports configured.</p>
          ) : (
            <div className="project-port-list">
              {project.preferredPorts.map((port) => {
                const state = portStates.get(port.id) ?? { kind: "missing" };
                return (
                  <div className="project-port-row" key={port.id}>
                    <div>
                      <strong>{port.label}</strong>
                      <span>
                        {roleLabel(port.role)}
                        {port.strict ? " · Strict" : ""}
                      </span>
                    </div>
                    <div className="project-port-result">
                      <code>{port.port}</code>
                      <span
                        className={`project-port-state is-${state.kind}`}
                        title={portStateDescription(state)}
                      >
                        <i />
                        {portStateLabel(state)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {[...portStates.values()].some((state) => state.kind === "conflict") ? (
            <p className="project-port-explanation">
              Used elsewhere means another detected Project currently owns that port.
            </p>
          ) : null}
          {[...portStates.values()].some((state) => state.kind === "unverified") ? (
            <p className="project-port-explanation">
              Port in use means QLayer found a listener but could not verify which Project owns it.
            </p>
          ) : null}
          {localhostError ? <p className="projects-warning">{localhostError}</p> : null}
        </section>

        <section className="project-detail-section">
          <header>
            <h2>Chats</h2>
            <button className="project-link-action" onClick={onLinkChats} type="button">
              <IconPlus aria-hidden="true" size={17} stroke={1.8} /> Link
            </button>
          </header>
          {project.linkedChats.length === 0 ? (
            <p className="project-section-empty">No linked chats.</p>
          ) : (
            <div className="project-linked-chats">
              {project.linkedChats.map((chat) => (
                <button key={chat.threadId} onClick={() => onOpenChat(chat.threadId)} type="button">
                  <IconMessages aria-hidden="true" size={18} stroke={1.6} />
                  <strong>{chat.displayName}</strong>
                  <IconExternalLink aria-hidden="true" size={17} stroke={1.7} />
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      {confirmDelete ? (
        <ProjectDeleteDialog
          projectName={project.name}
          onCancel={() => setConfirmDelete(false)}
          onConfirm={onDelete}
        />
      ) : null}
    </section>
  );
}

function DetectedServerPicker({
  detected,
  refreshing,
  onAdd,
}: {
  detected: DetectedProjectServers;
  refreshing: boolean;
  onAdd: (server: DetectedProjectServers["available"][number]) => void;
}) {
  const [selectedId, setSelectedId] = useState("");
  const selected = detected.available.find((server) => server.id === selectedId);

  useEffect(() => {
    if (selectedId && !selected) setSelectedId("");
  }, [selected, selectedId]);

  if (detected.detectedCount === 0) {
    return (
      <p className="project-section-empty">
        {refreshing
          ? "Checking for local development servers..."
          : "No local development servers detected."}
      </p>
    );
  }

  if (detected.available.length === 0) {
    return <p className="project-section-empty">All detected development servers are linked.</p>;
  }

  return (
    <div className="project-detected-port-picker">
      <select
        aria-label="Detected development server"
        onChange={(event) => setSelectedId(event.currentTarget.value)}
        value={selectedId}
      >
        <option value="">Select a detected server</option>
        {detected.available.map((server) => (
          <option key={server.id} value={server.id}>
            {server.displayAddress} | {server.projectName ?? detectedServerKindLabel(server.kind)}
          </option>
        ))}
      </select>
      <button
        disabled={!selected}
        onClick={() => {
          if (!selected) return;
          onAdd(selected);
          setSelectedId("");
        }}
        type="button"
      >
        <IconPlus aria-hidden="true" size={17} stroke={1.8} />
        Add
      </button>
    </div>
  );
}

function detectedServerKindLabel(
  kind: DetectedProjectServers["available"][number]["kind"],
): string {
  if (kind === "frontend") return "Frontend";
  if (kind === "backend") return "Backend";
  if (kind === "fullStack") return "Full stack";
  return "Dev server";
}

function ProjectDeleteDialog({
  projectName,
  onCancel,
  onConfirm,
}: {
  projectName: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (!ref.current?.open) ref.current?.showModal();
  }, []);
  return (
    <dialog className="project-delete-dialog" onCancel={onCancel} ref={ref}>
      <h2>Delete {projectName}?</h2>
      <p>
        This removes only its QLayer configuration. Files, chats, and running servers stay
        unchanged.
      </p>
      <div>
        <button onClick={onCancel} type="button">
          Cancel
        </button>
        <button className="is-danger" onClick={onConfirm} type="button">
          Delete Project
        </button>
      </div>
    </dialog>
  );
}

async function openProjectChat(threadId: string): Promise<void> {
  await invoke("open_codex_url", { url: buildCodexThreadLink(threadId) }).catch(() => undefined);
}

function shortProjectPath(path: string): string {
  const parts = path.replace(/\\/g, "/").split("/").filter(Boolean);
  return parts.slice(-2).join(" / ");
}

function roleLabel(role: Project["preferredPorts"][number]["role"]): string {
  return {
    frontend: "Frontend",
    backend: "Backend",
    fullstack: "Full stack",
    database: "Database",
    other: "Other",
  }[role];
}

export function portStateLabel(state: ProjectPortState): string {
  switch (state.kind) {
    case "running":
      return "Running";
    case "checking":
      return "Checking";
    case "conflict":
      return state.server.projectName ? `${state.server.projectName} uses it` : "Used elsewhere";
    case "unverified":
      return "Port in use";
    case "alternate":
      return `Running on ${state.server.port}`;
    case "missing":
      return "Not running";
  }
}

export function portStateDescription(state: ProjectPortState): string {
  switch (state.kind) {
    case "running":
      return "QLayer matched this local server to the Project folder.";
    case "checking":
      return "QLayer is checking active local servers.";
    case "conflict":
      return state.server.projectName
        ? `Port ${state.server.port} is used by ${state.server.projectName}, not this Project.`
        : `Port ${state.server.port} is used by another detected Project.`;
    case "unverified":
      return `Port ${state.server.port} is active, but QLayer cannot verify which Project owns it.`;
    case "alternate":
      return `This Project is running on port ${state.server.port} instead of the configured port.`;
    case "missing":
      return "No active local server was found on this port.";
  }
}
