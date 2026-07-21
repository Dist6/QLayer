import type { LocalhostServer, LocalhostSnapshot } from "./localhostManagerTypes";

export const LOCALHOST_SNAPSHOT_CACHE_MS = 5_000;

export function isLocalhostSnapshotFresh(cachedAtMs: number | null, nowMs: number): boolean {
  return (
    cachedAtMs !== null && nowMs >= cachedAtMs && nowMs - cachedAtMs <= LOCALHOST_SNAPSHOT_CACHE_MS
  );
}

export function hasLocalhostTopologyChanged(
  current: LocalhostSnapshot | null,
  next: LocalhostSnapshot,
): boolean {
  if (!current || current.hasLimitedProcessAccess !== next.hasLimitedProcessAccess) return true;
  return topologyKeys(current.servers).join("|") !== topologyKeys(next.servers).join("|");
}

function topologyKeys(servers: LocalhostServer[]): string[] {
  return servers
    .map((server) =>
      [
        server.id,
        server.url,
        server.port,
        server.isRunning,
        server.processName,
        server.startedAtMs,
        server.projectId,
        server.projectName,
        server.projectNameSource,
        server.classification,
        server.kind,
        server.binding,
      ].join(":"),
    )
    .sort();
}
