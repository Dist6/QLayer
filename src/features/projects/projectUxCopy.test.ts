import { describe, expect, it } from "vitest";

import type { LocalhostServer } from "../localhost-manager/localhostManagerTypes";
import { portStateDescription, portStateLabel } from "./ProjectsPanel";

const otherProjectServer: LocalhostServer = {
  id: "server",
  displayAddress: "localhost:3000",
  url: "http://localhost:3000",
  port: 3000,
  isRunning: true,
  processName: "node.exe",
  memoryBytes: null,
  startedAtMs: null,
  uptimeSeconds: null,
  cpuPercent: null,
  projectId: "other-project",
  projectName: "Other app",
  projectNameSource: "automatic",
  classification: "development",
  kind: "frontend",
  binding: "loopback",
};

describe("Project status copy", () => {
  it("explains a port owned by another Project", () => {
    const state = { kind: "conflict", server: otherProjectServer } as const;
    expect(portStateLabel(state)).toBe("Other app uses it");
    expect(portStateDescription(state)).toContain("used by Other app, not this Project");
  });

  it("distinguishes unknown ownership from a stopped server", () => {
    expect(portStateLabel({ kind: "unverified", server: otherProjectServer })).toBe("Port in use");
    expect(portStateLabel({ kind: "missing" })).toBe("Not running");
  });
});
