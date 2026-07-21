import { describe, expect, it } from "vitest";

import type { LocalhostServer, LocalhostSnapshot } from "./localhostManagerTypes";
import {
  hasLocalhostTopologyChanged,
  isLocalhostSnapshotFresh,
  LOCALHOST_SNAPSHOT_CACHE_MS,
} from "./localhostSnapshotStability";

const server: LocalhostServer = {
  id: "server-1420",
  displayAddress: "localhost:1420",
  url: "http://localhost:1420",
  port: 1420,
  isRunning: true,
  processName: "node.exe",
  memoryBytes: 100,
  startedAtMs: 1_700_000_000_000,
  uptimeSeconds: 60,
  cpuPercent: 1,
  projectId: "project-qolayer",
  projectName: "QLayer",
  projectNameSource: "automatic",
  classification: "development",
  kind: "frontend",
  binding: "loopback",
};

function snapshot(overrides: Partial<LocalhostServer> = {}): LocalhostSnapshot {
  return {
    servers: [{ ...server, ...overrides }],
    hasLimitedProcessAccess: false,
  };
}

describe("localhost snapshot stability", () => {
  it("ignores volatile resource-only changes during automatic refresh", () => {
    expect(
      hasLocalhostTopologyChanged(
        snapshot(),
        snapshot({ memoryBytes: 900, cpuPercent: 14, uptimeSeconds: 180 }),
      ),
    ).toBe(false);
  });

  it("reuses only a recently verified snapshot", () => {
    expect(isLocalhostSnapshotFresh(1_000, 1_000 + LOCALHOST_SNAPSHOT_CACHE_MS)).toBe(true);
    expect(isLocalhostSnapshotFresh(1_000, 1_001 + LOCALHOST_SNAPSHOT_CACHE_MS)).toBe(false);
    expect(isLocalhostSnapshotFresh(null, 1_000)).toBe(false);
  });
  it("detects server and project topology changes", () => {
    expect(hasLocalhostTopologyChanged(snapshot(), snapshot({ port: 3000 }))).toBe(true);
    expect(
      hasLocalhostTopologyChanged(snapshot(), snapshot({ projectName: "Another project" })),
    ).toBe(true);
  });
});
