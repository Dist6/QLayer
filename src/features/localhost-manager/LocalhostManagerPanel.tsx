import {
  IconCheck,
  IconChevronDown,
  IconDots,
  IconExternalLink,
  IconPencil,
  IconRefresh,
  IconServerOff,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { useMemo, useState } from "react";

import type { LocalhostAutoRefreshSeconds } from "../settings/settingsTypes";
import {
  openLocalhostServer,
  removeLocalhostProjectAlias,
  setLocalhostProjectAlias,
} from "./localhostManagerClient";
import {
  accessibleUptime,
  formatCpu,
  formatMemory,
  formatUptime,
  kindLabel,
} from "./localhostManagerFormatters";
import { groupDevelopmentServers } from "./localhostManagerGrouping";
import type { LocalhostServer, LocalhostSnapshot } from "./localhostManagerTypes";
import { useLocalhostServers } from "./useLocalhostServers";
import { useVisibleInterval } from "./useVisibleInterval";

type LocalhostManagerPanelProps = {
  autoRefreshSeconds: LocalhostAutoRefreshSeconds;
};

export function LocalhostManagerPanel({ autoRefreshSeconds }: LocalhostManagerPanelProps) {
  const state = useLocalhostServers(autoRefreshSeconds);
  const setProjectName = async (serverId: string, name: string) => {
    await setLocalhostProjectAlias(serverId, name);
    await state.refresh();
  };
  const removeProjectName = async (serverId: string) => {
    await removeLocalhostProjectAlias(serverId);
    await state.refresh();
  };
  return (
    <LocalhostManagerContent
      error={state.error}
      loading={state.loading}
      onOpen={openLocalhostServer}
      onRefresh={state.refresh}
      onRemoveProjectName={removeProjectName}
      onSetProjectName={setProjectName}
      refreshing={state.refreshing}
      snapshot={state.snapshot}
    />
  );
}

export function LocalhostManagerContent({
  error,
  loading,
  onOpen,
  onRefresh,
  onRemoveProjectName,
  onSetProjectName,
  refreshing,
  snapshot,
}: {
  error: string | null;
  loading: boolean;
  onOpen: (serverId: string) => Promise<void>;
  onRefresh: () => Promise<void>;
  onRemoveProjectName?: (serverId: string) => Promise<void>;
  onSetProjectName?: (serverId: string, name: string) => Promise<void>;
  refreshing: boolean;
  snapshot: LocalhostSnapshot | null;
}) {
  const [unknownExpanded, setUnknownExpanded] = useState(false);
  const [openError, setOpenError] = useState<string | null>(null);
  const [, setMinuteTick] = useState(0);
  const development = useMemo(
    () => snapshot?.servers.filter((server) => server.classification === "development") ?? [],
    [snapshot],
  );
  const unknown = useMemo(
    () => snapshot?.servers.filter((server) => server.classification === "unknown") ?? [],
    [snapshot],
  );

  useVisibleInterval(() => setMinuteTick((value) => value + 1), 60_000, true);

  const openServer = async (serverId: string) => {
    setOpenError(null);
    try {
      await onOpen(serverId);
    } catch (reason) {
      setOpenError(
        typeof reason === "string"
          ? reason
          : reason instanceof Error
            ? reason.message
            : "The local server could not be opened.",
      );
    }
  };

  return (
    <section className="tool-view localhost-manager-view">
      <header className="localhost-heading">
        <div>
          <h1>Localhost Manager</h1>
          <span>{snapshot ? `${development.length} running` : "Checking"}</span>
        </div>
        <button
          aria-label="Refresh local servers"
          className={
            refreshing ? "icon-action refresh-action is-spinning" : "icon-action refresh-action"
          }
          disabled={refreshing}
          onClick={() => void onRefresh()}
          title="Refresh"
          type="button"
        >
          <IconRefresh aria-hidden="true" size={18} stroke={1.7} />
        </button>
      </header>

      <div className="localhost-scroll">
        {loading && !snapshot ? <LoadingRows /> : null}
        {!loading && error && !snapshot ? (
          <div className="localhost-state" role="alert">
            <IconServerOff aria-hidden="true" size={22} stroke={1.6} />
            <strong>Local servers unavailable</strong>
            <span>{error}</span>
            <button onClick={() => void onRefresh()} type="button">
              Try again
            </button>
          </div>
        ) : null}
        {snapshot && development.length === 0 ? (
          <div className="localhost-state localhost-empty">
            <IconServerOff aria-hidden="true" size={22} stroke={1.6} />
            <strong>No local development servers detected.</strong>
            <span>Refresh after starting a frontend or backend server.</span>
          </div>
        ) : null}
        {development.length > 0 ? (
          <ServerSection
            label="Dev servers"
            onOpen={(id) => void openServer(id)}
            onRemoveProjectName={onRemoveProjectName}
            onSetProjectName={onSetProjectName}
            servers={development}
          />
        ) : null}

        {unknown.length > 0 ? (
          <section className="localhost-unknown">
            <button
              aria-expanded={unknownExpanded}
              className="localhost-section-toggle"
              onClick={() => setUnknownExpanded((value) => !value)}
              type="button"
            >
              <span>Other local listeners</span>
              <small>{unknown.length}</small>
              <IconChevronDown aria-hidden="true" size={17} stroke={1.7} />
            </button>
            {unknownExpanded ? <ServerRows servers={unknown} /> : null}
          </section>
        ) : null}

        {snapshot?.hasLimitedProcessAccess ? (
          <p className="localhost-warning">Some process details are unavailable.</p>
        ) : null}
        {error && snapshot ? <p className="localhost-warning">{error}</p> : null}
        {openError ? (
          <p className="localhost-warning" role="alert">
            {openError}
          </p>
        ) : null}
      </div>
    </section>
  );
}

function ServerSection({
  label,
  onOpen,
  onRemoveProjectName,
  onSetProjectName,
  servers,
}: {
  label: string;
  onOpen: (id: string) => void;
  onRemoveProjectName?: (id: string) => Promise<void>;
  onSetProjectName?: (id: string, name: string) => Promise<void>;
  servers: LocalhostServer[];
}) {
  const groups = groupDevelopmentServers(servers);
  return (
    <section className="localhost-section">
      <h2>{label}</h2>
      <div className="localhost-groups">
        {groups.map((group) =>
          group.projectName ? (
            <section className="localhost-project-group" key={group.key}>
              <header>
                <strong>{group.projectName}</strong>
                <span>{group.servers.length} endpoints</span>
              </header>
              <ServerRows
                hideProjectName
                onOpen={onOpen}
                onRemoveProjectName={onRemoveProjectName}
                onSetProjectName={onSetProjectName}
                servers={group.servers}
              />
            </section>
          ) : (
            <ServerRows
              key={group.key}
              onOpen={onOpen}
              onRemoveProjectName={onRemoveProjectName}
              onSetProjectName={onSetProjectName}
              servers={group.servers}
            />
          ),
        )}
      </div>
    </section>
  );
}

function ServerRows({
  hideProjectName = false,
  onOpen,
  onRemoveProjectName,
  onSetProjectName,
  servers,
}: {
  hideProjectName?: boolean;
  onOpen?: (id: string) => void;
  onRemoveProjectName?: (id: string) => Promise<void>;
  onSetProjectName?: (id: string, name: string) => Promise<void>;
  servers: LocalhostServer[];
}) {
  return (
    <div className="localhost-list">
      {servers.map((server) => (
        <ServerRow
          hideProjectName={hideProjectName}
          key={server.id}
          onOpen={onOpen}
          onRemoveProjectName={onRemoveProjectName}
          onSetProjectName={onSetProjectName}
          server={server}
        />
      ))}
    </div>
  );
}

function ServerRow({
  hideProjectName,
  onOpen,
  onRemoveProjectName,
  onSetProjectName,
  server,
}: {
  hideProjectName: boolean;
  onOpen?: (id: string) => void;
  onRemoveProjectName?: (id: string) => Promise<void>;
  onSetProjectName?: (id: string, name: string) => Promise<void>;
  server: LocalhostServer;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [projectName, setProjectName] = useState(server.projectName ?? "");
  const [saving, setSaving] = useState(false);
  const [aliasError, setAliasError] = useState<string | null>(null);
  const uptimeSeconds =
    server.startedAtMs !== null
      ? Math.max(0, Math.floor((Date.now() - server.startedAtMs) / 1_000))
      : server.uptimeSeconds;
  const identity = [
    server.classification === "development" ? kindLabel(server.kind) : "Unknown listener",
    server.processName,
  ].filter((value): value is string => Boolean(value));
  const uptime = formatUptime(uptimeSeconds);
  const resources = [
    formatMemory(server.memoryBytes),
    formatCpu(server.cpuPercent),
    uptime ? `Up ${uptime}` : null,
  ].filter((value): value is string => Boolean(value));
  const canNameProject = Boolean(server.projectId && onSetProjectName);

  const beginEditing = () => {
    setProjectName(server.projectName ?? "");
    setAliasError(null);
    setMenuOpen(false);
    setEditing(true);
  };

  const saveProjectName = async () => {
    const nextName = projectName.trim();
    if (!onSetProjectName || nextName.length === 0) return;
    setSaving(true);
    setAliasError(null);
    try {
      await onSetProjectName(server.id, nextName);
      setEditing(false);
    } catch (reason) {
      setAliasError(readActionError(reason, "The project name could not be saved."));
    } finally {
      setSaving(false);
    }
  };

  const removeProjectName = async () => {
    if (!onRemoveProjectName) return;
    setMenuOpen(false);
    setSaving(true);
    setAliasError(null);
    try {
      await onRemoveProjectName(server.id);
    } catch (reason) {
      setAliasError(readActionError(reason, "The project name could not be removed."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="localhost-row">
      <span aria-hidden="true" className="server-status-dot" />
      <div className="localhost-copy">
        <div className="localhost-primary">
          <strong>{server.displayAddress}</strong>
          {server.projectName && !hideProjectName ? (
            <span className="localhost-project" title={server.projectName}>
              ({server.projectName})
            </span>
          ) : null}
        </div>
        {identity.length > 0 ? (
          <span className="localhost-identity">{identity.join(" · ")}</span>
        ) : null}
        {resources.length > 0 ? (
          <span
            className="localhost-resources"
            title={accessibleUptime(uptimeSeconds) ?? undefined}
          >
            {resources.join(" · ")}
          </span>
        ) : null}
        {editing ? (
          <form
            className="localhost-alias-form"
            onSubmit={(event) => {
              event.preventDefault();
              void saveProjectName();
            }}
          >
            <input
              aria-label={`Project name for ${server.displayAddress}`}
              autoFocus
              disabled={saving}
              maxLength={48}
              onChange={(event) => setProjectName(event.currentTarget.value)}
              placeholder="Project name"
              value={projectName}
            />
            <button
              aria-label="Save project name"
              disabled={saving || projectName.trim().length === 0}
              type="submit"
            >
              <IconCheck aria-hidden="true" size={16} stroke={1.8} />
            </button>
            <button
              aria-label="Cancel renaming"
              disabled={saving}
              onClick={() => setEditing(false)}
              type="button"
            >
              <IconX aria-hidden="true" size={16} stroke={1.8} />
            </button>
          </form>
        ) : null}
        {aliasError ? (
          <span className="localhost-alias-error" role="alert">
            {aliasError}
          </span>
        ) : null}
      </div>
      <div className="localhost-row-actions">
        {onOpen && server.url ? (
          <button
            aria-label={`Open ${server.displayAddress}`}
            className="icon-action localhost-open"
            onClick={() => onOpen(server.id)}
            title="Open in browser"
            type="button"
          >
            <IconExternalLink aria-hidden="true" size={17} stroke={1.7} />
          </button>
        ) : null}
        {canNameProject ? (
          <button
            aria-expanded={menuOpen}
            aria-label={`Project actions for ${server.displayAddress}`}
            className="icon-action localhost-project-actions"
            disabled={saving}
            onClick={() => setMenuOpen((value) => !value)}
            title="Project actions"
            type="button"
          >
            <IconDots aria-hidden="true" size={18} stroke={1.7} />
          </button>
        ) : null}
        {menuOpen ? (
          <div className="localhost-row-menu">
            <button onClick={beginEditing} type="button">
              <IconPencil aria-hidden="true" size={16} stroke={1.7} />
              {server.projectName ? "Rename project" : "Name project"}
            </button>
            {server.projectNameSource === "manual" && onRemoveProjectName ? (
              <button onClick={() => void removeProjectName()} type="button">
                <IconTrash aria-hidden="true" size={16} stroke={1.7} />
                Use detected name
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function readActionError(reason: unknown, fallback: string): string {
  if (typeof reason === "string") return reason;
  return reason instanceof Error ? reason.message : fallback;
}

function LoadingRows() {
  return (
    <div aria-label="Loading local servers" className="localhost-loading" role="status">
      <span />
      <span />
      <span />
    </div>
  );
}
