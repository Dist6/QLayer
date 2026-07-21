import type { LocalhostServer } from "./localhostManagerTypes";

export type LocalhostServerGroup = {
  key: string;
  projectName: string | null;
  servers: LocalhostServer[];
};

export function groupDevelopmentServers(servers: LocalhostServer[]): LocalhostServerGroup[] {
  const projectCounts = new Map<string, number>();
  for (const server of servers) {
    if (server.projectId && server.projectName) {
      projectCounts.set(server.projectId, (projectCounts.get(server.projectId) ?? 0) + 1);
    }
  }

  const groups: LocalhostServerGroup[] = [];
  const groupIndexes = new Map<string, number>();
  for (const server of servers) {
    const projectId = server.projectId;
    const shouldGroup =
      projectId !== null && server.projectName !== null && (projectCounts.get(projectId) ?? 0) > 1;
    if (!shouldGroup || projectId === null) {
      groups.push({ key: `server:${server.id}`, projectName: null, servers: [server] });
      continue;
    }

    const existingIndex = groupIndexes.get(projectId);
    if (existingIndex === undefined) {
      groupIndexes.set(projectId, groups.length);
      groups.push({
        key: `project:${projectId}`,
        projectName: server.projectName,
        servers: [server],
      });
    } else {
      groups[existingIndex].servers.push(server);
    }
  }
  return groups;
}
