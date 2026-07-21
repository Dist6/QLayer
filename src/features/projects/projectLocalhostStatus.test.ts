import { describe, expect, it } from "vitest";

import type { LocalhostServer } from "../localhost-manager/localhostManagerTypes";
import { deriveProjectPortStates } from "./projectLocalhostStatus";
import type { ProjectPort } from "./projectTypes";

const ROOT = "project-0123456789abcdef";

function server(overrides: Partial<LocalhostServer> = {}): LocalhostServer {
  return {
    id: "server",
    displayAddress: "localhost:1420",
    url: "http://localhost:1420",
    port: 1420,
    isRunning: true,
    processName: "node.exe",
    memoryBytes: null,
    startedAtMs: null,
    uptimeSeconds: null,
    cpuPercent: null,
    projectId: ROOT,
    projectName: "QLayer",
    projectNameSource: "automatic",
    classification: "development",
    kind: "frontend",
    binding: "loopback",
    ...overrides,
  };
}

function port(overrides: Partial<ProjectPort> = {}): ProjectPort {
  return { id: "web", label: "Frontend", role: "frontend", port: 1420, strict: true, ...overrides };
}

function state(preferred: ProjectPort, servers: LocalhostServer[], checking = false) {
  return deriveProjectPortStates(
    { rootIdentity: ROOT, preferredPorts: [preferred] },
    { servers, hasLimitedProcessAccess: false },
    checking,
  ).get(preferred.id);
}

describe("Project localhost status", () => {
  it("requires a matching root identity for running", () => {
    expect(state(port(), [server()])?.kind).toBe("running");
    expect(state(port(), [server({ projectId: "project-1111111111111111" })])?.kind).toBe(
      "conflict",
    );
    expect(
      state(port(), [server({ projectId: null, projectName: null, projectNameSource: null })])
        ?.kind,
    ).toBe("unverified");
  });

  it("reports missing and checking states", () => {
    expect(state(port(), [])?.kind).toBe("missing");
    expect(state(port(), [], true)?.kind).toBe("checking");
  });

  it("shows reliable alternate ports only for non-strict matching roles", () => {
    const alternate = server({
      port: 5173,
      displayAddress: "localhost:5173",
      url: "http://localhost:5173",
    });
    expect(state(port({ strict: false }), [alternate])?.kind).toBe("alternate");
    expect(state(port({ strict: true }), [alternate])?.kind).toBe("missing");
    expect(state(port({ strict: false, role: "backend" }), [alternate])?.kind).toBe("missing");
  });
});
