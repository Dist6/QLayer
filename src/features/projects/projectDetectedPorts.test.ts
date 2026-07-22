import { describe, expect, it } from "vitest";

import type {
  LocalhostServer,
  LocalhostSnapshot,
} from "../localhost-manager/localhostManagerTypes";
import { createProjectPortFromServer, getDetectedProjectServers } from "./projectDetectedPorts";

function server(overrides: Partial<LocalhostServer> = {}): LocalhostServer {
  return {
    id: "server-5173",
    displayAddress: "localhost:5173",
    url: "http://localhost:5173",
    port: 5173,
    isRunning: true,
    processName: "node.exe",
    memoryBytes: null,
    startedAtMs: null,
    uptimeSeconds: null,
    cpuPercent: null,
    projectId: null,
    projectName: null,
    projectNameSource: null,
    classification: "development",
    kind: "frontend",
    binding: "loopback",
    ...overrides,
  };
}

describe("detected Project ports", () => {
  it("offers only running development servers that are not configured", () => {
    const snapshot: LocalhostSnapshot = {
      servers: [
        server(),
        server({
          id: "backend",
          port: 4100,
          displayAddress: "localhost:4100",
          url: "http://localhost:4100",
          kind: "backend",
        }),
        server({
          id: "unknown",
          port: 9000,
          displayAddress: "localhost:9000",
          url: null,
          classification: "unknown",
        }),
      ],
      hasLimitedProcessAccess: false,
    };

    expect(
      getDetectedProjectServers(
        {
          preferredPorts: [{ id: "web", label: "Web", role: "frontend", port: 5173, strict: true }],
        },
        snapshot,
      ),
    ).toMatchObject({ detectedCount: 2, available: [{ port: 4100 }] });
  });

  it("creates a strict preferred port from the detected server", () => {
    expect(createProjectPortFromServer(server({ projectName: "Storefront" }), "port-id")).toEqual({
      id: "port-id",
      label: "Storefront",
      role: "frontend",
      port: 5173,
      strict: true,
    });
  });
});
