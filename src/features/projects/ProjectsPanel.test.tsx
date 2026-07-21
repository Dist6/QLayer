import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { LocalhostSnapshot } from "../localhost-manager/localhostManagerTypes";
import type { Project } from "./projectTypes";
import { ProjectListView } from "./ProjectsPanel";

const project: Project = {
  id: "qolayer",
  name: "QoLayer",
  rootPath: "C:\\Users\\example\\Documents\\QoLayer",
  rootIdentity: "project-0123456789abcdef",
  linkedChats: [
    {
      threadId: "019f72d8-d02e-75d1-9969-d6c5a647c95e",
      displayName: "Projects architecture",
      linkedAt: "2026-07-20T00:00:00.000Z",
    },
  ],
  preferredPorts: [{ id: "web", label: "Frontend", role: "frontend", port: 1420, strict: true }],
  createdAt: "2026-07-20T00:00:00.000Z",
  updatedAt: "2026-07-20T00:00:00.000Z",
};

const snapshot: LocalhostSnapshot = {
  hasLimitedProcessAccess: false,
  servers: [
    {
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
      projectId: project.rootIdentity,
      projectName: "QoLayer",
      projectNameSource: "automatic",
      classification: "development",
      kind: "frontend",
      binding: "loopback",
    },
  ],
};

describe("Projects interface", () => {
  it("renders the concise empty state", () => {
    const markup = renderToStaticMarkup(
      <ProjectListView
        loading={false}
        onCreate={() => undefined}
        onOpen={() => undefined}
        projects={[]}
        snapshot={null}
      />,
    );
    expect(markup).toContain("No projects yet.");
    expect(markup).toContain("New Project");
  });

  it("renders folder, chat, and verified running summaries", () => {
    const markup = renderToStaticMarkup(
      <ProjectListView
        loading={false}
        onCreate={() => undefined}
        onOpen={() => undefined}
        projects={[project]}
        snapshot={snapshot}
      />,
    );
    expect(markup).toContain("QoLayer");
    expect(markup).toContain("Documents / QoLayer");
    expect(markup).toContain("1 chat · 1/1 running");
  });
});
