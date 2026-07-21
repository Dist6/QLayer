import { describe, expect, it } from "vitest";

import { parseLocalhostSnapshot } from "./localhostManagerTypes";

const validServer = {
  id: "local-1",
  displayAddress: "localhost:5173",
  url: "http://localhost:5173",
  port: 5173,
  isRunning: true,
  processName: "node.exe",
  memoryBytes: 184_000_000,
  startedAtMs: 1_000,
  uptimeSeconds: 42,
  cpuPercent: null,
  projectId: "project-123",
  projectName: null,
  projectNameSource: null,
  classification: "development",
  kind: "unknown",
  binding: "loopback",
};

describe("localhost manager contracts", () => {
  it("parses a sanitized snapshot", () => {
    expect(
      parseLocalhostSnapshot({ servers: [validServer], hasLimitedProcessAccess: false }),
    ).toEqual({ servers: [validServer], hasLimitedProcessAccess: false });
  });

  it.each([
    { ...validServer, port: 0 },
    { ...validServer, displayAddress: "example.com:5173" },
    { ...validServer, url: "https://example.com" },
    { ...validServer, memoryBytes: -1 },
    { ...validServer, cpuPercent: 101 },
    { ...validServer, classification: "unknown" },
    { ...validServer, projectName: "Portal", projectNameSource: null },
    { ...validServer, projectName: null, projectNameSource: "automatic" },
  ])("rejects unsafe or malformed server data", (server) => {
    expect(() =>
      parseLocalhostSnapshot({ servers: [server], hasLimitedProcessAccess: false }),
    ).toThrow("invalid data");
  });

  it("accepts unknown listeners only without a browser URL", () => {
    const server = {
      ...validServer,
      url: null,
      classification: "unknown",
      processName: null,
      memoryBytes: null,
      startedAtMs: null,
      uptimeSeconds: null,
    };
    expect(parseLocalhostSnapshot({ servers: [server], hasLimitedProcessAccess: true })).toEqual({
      servers: [server],
      hasLimitedProcessAccess: true,
    });
  });
});
