import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { LocalhostManagerContent } from "./LocalhostManagerPanel";
import type { LocalhostSnapshot } from "./localhostManagerTypes";

const snapshot: LocalhostSnapshot = {
  hasLimitedProcessAccess: false,
  servers: [
    {
      binding: "loopback",
      classification: "development",
      cpuPercent: 1.4,
      displayAddress: "localhost:5173",
      id: "local-1",
      isRunning: true,
      kind: "frontend",
      memoryBytes: 45 * 1024 * 1024,
      port: 5173,
      processName: "node.exe",
      projectId: "project-qolayer",
      projectName: "QLayer",
      projectNameSource: "automatic",
      startedAtMs: null,
      uptimeSeconds: 125,
      url: "http://localhost:5173",
    },
    {
      binding: "allInterfaces",
      classification: "unknown",
      cpuPercent: null,
      displayAddress: "localhost:8080",
      id: "local-2",
      isRunning: true,
      kind: "unknown",
      memoryBytes: null,
      port: 8080,
      processName: "service.exe",
      projectId: null,
      projectName: null,
      projectNameSource: null,
      startedAtMs: null,
      uptimeSeconds: null,
      url: null,
    },
  ],
};

describe("LocalhostManagerContent", () => {
  it("shows trusted development servers and keeps unknown listeners collapsed", () => {
    const markup = renderToStaticMarkup(
      <LocalhostManagerContent
        error={null}
        loading={false}
        onOpen={() => Promise.resolve()}
        onRefresh={() => Promise.resolve()}
        refreshing={false}
        snapshot={snapshot}
      />,
    );

    expect(markup).toContain("Localhost Manager");
    expect(markup).toContain("1 running");
    expect(markup).toContain("localhost:5173");
    expect(markup).toContain("(QLayer)");
    expect(markup).toContain("Frontend · node.exe");
    expect(markup).toContain("47 MB · 1.4% CPU · Up 2m");
    expect(markup).toContain('aria-label="Open localhost:5173"');
    expect(markup).toContain('aria-expanded="false"');
    expect(markup).not.toContain("localhost:8080");
  });

  it("omits project placeholders when no reliable name exists", () => {
    const unnamedSnapshot: LocalhostSnapshot = {
      hasLimitedProcessAccess: false,
      servers: [{ ...snapshot.servers[0], kind: "unknown", projectName: null }],
    };
    const markup = renderToStaticMarkup(
      <LocalhostManagerContent
        error={null}
        loading={false}
        onOpen={() => Promise.resolve()}
        onRefresh={() => Promise.resolve()}
        refreshing={false}
        snapshot={unnamedSnapshot}
      />,
    );

    expect(markup).toContain("Dev server · node.exe");
    expect(markup).not.toContain("Unknown project");
    expect(markup).not.toContain("Unnamed");
  });

  it("renders a clear empty state", () => {
    const markup = renderToStaticMarkup(
      <LocalhostManagerContent
        error={null}
        loading={false}
        onOpen={() => Promise.resolve()}
        onRefresh={() => Promise.resolve()}
        refreshing={false}
        snapshot={{ hasLimitedProcessAccess: false, servers: [] }}
      />,
    );

    expect(markup).toContain("No local development servers detected.");
    expect(markup).toContain("Refresh after starting a frontend or backend server.");
  });
});
