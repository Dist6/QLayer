import { describe, expect, it } from "vitest";

import { groupDevelopmentServers } from "./localhostManagerGrouping";
import type { LocalhostServer } from "./localhostManagerTypes";

function server(
  port: number,
  projectId: string | null,
  projectName: string | null,
): LocalhostServer {
  return {
    binding: "loopback",
    classification: "development",
    cpuPercent: null,
    displayAddress: `localhost:${port}`,
    id: `local-${port}`,
    isRunning: true,
    kind: "unknown",
    memoryBytes: null,
    port,
    processName: "node.exe",
    projectId,
    projectName,
    projectNameSource: projectName ? "automatic" : null,
    startedAtMs: null,
    uptimeSeconds: null,
    url: `http://localhost:${port}`,
  };
}

describe("groupDevelopmentServers", () => {
  it("groups multiple endpoints only when they share a named project identity", () => {
    const groups = groupDevelopmentServers([
      server(3000, "project-one", "Storefront"),
      server(4100, "project-one", "Storefront"),
      server(5173, "project-two", "Admin"),
    ]);

    expect(groups).toHaveLength(2);
    expect(groups[0].projectName).toBe("Storefront");
    expect(groups[0].servers.map((item) => item.port)).toEqual([3000, 4100]);
    expect(groups[1].servers).toHaveLength(1);
  });

  it("keeps unnamed listeners separate even when they share an opaque identity", () => {
    const groups = groupDevelopmentServers([
      server(3000, "project-one", null),
      server(3001, "project-one", null),
    ]);

    expect(groups).toHaveLength(2);
  });
});
