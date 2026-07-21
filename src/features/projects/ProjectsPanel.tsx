import {
  IconArrowLeft,
  IconChevronRight,
  IconDots,
  IconExternalLink,
  IconFolderPlus,
  IconMessages,
  IconPencil,
  IconPlus,
  IconServer,
  IconTrash,
} from "@tabler/icons-react";
import { invoke } from "@tauri-apps/api/core";
import { type MouseEvent, useEffect, useRef, useState } from "react";

import type { ChatDestinationsState } from "../chat-shortcuts/useChatDestinations";
import { buildCodexThreadLink } from "../codex/deepLinks";
import type { LocalhostAutoRefreshSeconds } from "../settings/settingsTypes";
import { useLocalhostServers } from "../localhost-manager/useLocalhostServers";
import { ProjectActionDialog } from "./ProjectActionDialog";
import { ProjectEditorView } from "./ProjectEditorView";
import { runProjectAction } from "./projectActionClient";
import { deriveProjectPortStates, type ProjectPortState } from "./projectLocalhostStatus";
import type { Project, ProjectDevelopmentAction } from "./projectTypes";
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
  | { kind: "edit"; projectId: string };

export function ProjectsPanel({ state, chats, autoRefreshSeconds }: ProjectsPanelProps) {
  const [view, setView] = useState<ProjectsView>({ kind: "list" });
  const [actionRequest, setActionRequest] = useState<{
    projectId: string;
    action: ProjectDevelopmentAction;
  }>();
  const [actionBusy, setActionBusy] = useState(false);
  const [actionMessage, setActionMessage] = useState<string>();
  const [fallbackText, setFallbackText] = useState<string>();
  const [actionFeedback, setActionFeedback] = useState<string>();
  const verificationTimerRef = useRef<number | undefined>(undefined);
  const localhost = useLocalhostServers(autoRefreshSeconds);

  useEffect(() => {
    if (!chats.discoveryAttempted) void chats.refreshRecent();
  }, [chats]);

  useEffect(
    () => () => {
      if (verificationTimerRef.current !== undefined) {
        globalThis.clearInterval(verificationTimerRef.current);
      }
    },
    [],
  );

  const selectedProject =
    view.kind === "detail" || view.kind === "edit"
      ? state.projects.find((project) => project.id === view.projectId)
      : undefined;

  useEffect(() => {
    if ((view.kind === "detail" || view.kind === "edit") && !selectedProject) {
      setView({ kind: "list" });
    }
  }, [selectedProject, view.kind]);

  const actionProject = actionRequest
    ? state.projects.find((project) => project.id === actionRequest.projectId)
    : undefined;

  const beginAction = (project: Project, action: ProjectDevelopmentAction) => {
    setActionFeedback(undefined);
    setActionMessage(undefined);
    setFallbackText(undefined);
    setActionRequest({ projectId: project.id, action });
  };

  const confirmAction = async (
    project: Project,
    action: ProjectDevelopmentAction,
    threadId: string,
  ) => {
    setActionBusy(true);
    setActionMessage("Sending the action to Codex...");
    setFallbackText(undefined);
    state.update(project.id, {
      name: project.name,
      rootPath: project.rootPath,
      rootIdentity: project.rootIdentity,
      linkedChats: project.linkedChats,
      preferredPorts: project.preferredPorts,
      lastSelectedChatId: threadId,
    });

    const outcome = await runProjectAction(project, action, threadId);
    setActionBusy(false);
    setActionMessage(outcome.message);

    if (outcome.status === "manualFallback") {
      setFallbackText(outcome.fallbackText);
      return;
    }

    setActionRequest(undefined);
    setActionFeedback(outcome.message);
    if (outcome.status === "completed") {
      startPortVerification(localhost.refresh, verificationTimerRef);
    }
  };

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

  if (view.kind === "detail" && selectedProject) {
    return (
      <>
        <ProjectDetailView
          actionFeedback={actionFeedback}
          localhostError={localhost.error}
          onAction={(action) => beginAction(selectedProject, action)}
          onBack={() => setView({ kind: "list" })}
          onDelete={() => {
            state.remove(selectedProject.id);
            setView({ kind: "list" });
          }}
          onEdit={() => setView({ kind: "edit", projectId: selectedProject.id })}
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
        {actionRequest && actionProject ? (
          <ProjectActionDialog
            action={actionRequest.action}
            busy={actionBusy}
            fallbackText={fallbackText}
            message={actionMessage}
            onCancel={() => {
              setActionRequest(undefined);
              setActionMessage(undefined);
              setFallbackText(undefined);
            }}
            onConfirm={(threadId) =>
              void confirmAction(actionProject, actionRequest.action, threadId)
            }
            project={actionProject}
          />
        ) : null}
      </>
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
  refreshing,
  localhostError,
  actionFeedback,
  onBack,
  onEdit,
  onDelete,
  onOpenChat,
  onRefresh,
  onAction,
}: {
  project: Project;
  portStates: ReadonlyMap<string, ProjectPortState>;
  refreshing: boolean;
  localhostError: string | null;
  actionFeedback?: string;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onOpenChat: (threadId: string) => void;
  onRefresh: () => void;
  onAction: (action: ProjectDevelopmentAction) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const running = [...portStates.values()].filter((state) => state.kind === "running").length;

  const closeMenu = (event: MouseEvent) => {
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
            aria-label="Project actions"
            className="icon-action"
            onClick={() => setMenuOpen((current) => !current)}
            type="button"
          >
            <IconDots aria-hidden="true" size={20} stroke={1.8} />
          </button>
          {menuOpen ? (
            <div className="project-menu">
              <button
                onClick={(event) => {
                  closeMenu(event);
                  onEdit();
                }}
                type="button"
              >
                <IconPencil aria-hidden="true" size={17} stroke={1.7} /> Edit Project
              </button>
              <button
                className="is-danger"
                onClick={(event) => {
                  closeMenu(event);
                  setConfirmDelete(true);
                }}
                type="button"
              >
                <IconTrash aria-hidden="true" size={17} stroke={1.7} /> Delete Project
              </button>
            </div>
          ) : null}
        </div>
      </header>

      <div className="project-detail-scroll">
        <div className="project-development-actions">
          <button
            disabled={project.linkedChats.length === 0}
            onClick={() => onAction("startDevelopment")}
            type="button"
          >
            Start Development
          </button>
          <button
            disabled={project.linkedChats.length === 0}
            onClick={() => onAction("stopDevelopment")}
            type="button"
          >
            Stop Development
          </button>
        </div>
        {actionFeedback ? (
          <p className="project-action-feedback" role="status">
            {actionFeedback}
          </p>
        ) : null}

        <section className="project-detail-section">
          <header>
            <h2>Localhost</h2>
            <button
              className={refreshing ? "icon-action is-spinning" : "icon-action"}
              disabled={refreshing}
              onClick={onRefresh}
              type="button"
            >
              <IconServer aria-hidden="true" size={17} stroke={1.7} />
            </button>
          </header>
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
                    <code>{port.port}</code>
                    <span className={`project-port-state is-${state.kind}`}>
                      <i />
                      {portStateLabel(state)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
          {localhostError ? <p className="projects-warning">{localhostError}</p> : null}
        </section>

        <section className="project-detail-section">
          <header>
            <h2>Chats</h2>
            <button className="project-link-action" onClick={onEdit} type="button">
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

function startPortVerification(
  refresh: () => Promise<void>,
  timerRef: { current: number | undefined },
): void {
  if (timerRef.current !== undefined) globalThis.clearInterval(timerRef.current);
  void refresh();
  let remainingChecks = 12;
  timerRef.current = globalThis.setInterval(() => {
    remainingChecks -= 1;
    if (remainingChecks <= 0) {
      if (timerRef.current !== undefined) globalThis.clearInterval(timerRef.current);
      timerRef.current = undefined;
      return;
    }
    void refresh();
  }, 5_000);
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

function portStateLabel(state: ProjectPortState): string {
  switch (state.kind) {
    case "running":
      return "Running";
    case "checking":
      return "Checking";
    case "conflict":
      return "Conflict";
    case "unverified":
      return "Unverified";
    case "alternate":
      return `On ${state.server.port}`;
    case "missing":
      return "Missing";
  }
}
