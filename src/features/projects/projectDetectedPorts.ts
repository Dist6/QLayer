import type {
  DevelopmentServerKind,
  LocalhostServer,
  LocalhostSnapshot,
} from "../localhost-manager/localhostManagerTypes";
import type { Project, ProjectPort, ProjectPortRole } from "./projectTypes";

export type DetectedProjectServers = {
  available: LocalhostServer[];
  detectedCount: number;
};

export function getDetectedProjectServers(
  project: Pick<Project, "preferredPorts">,
  snapshot: LocalhostSnapshot | null,
): DetectedProjectServers {
  const configuredPorts = new Set(project.preferredPorts.map((port) => port.port));
  const detected = (snapshot?.servers ?? [])
    .filter((server) => server.isRunning && server.classification === "development")
    .sort((left, right) => left.port - right.port);

  return {
    available: detected.filter((server) => !configuredPorts.has(server.port)),
    detectedCount: detected.length,
  };
}

export function createProjectPortFromServer(
  server: LocalhostServer,
  id: string = crypto.randomUUID(),
): ProjectPort {
  const role = roleFromServerKind(server.kind);
  return {
    id,
    label: server.projectName ?? detectedPortLabel(role),
    role,
    port: server.port,
    strict: true,
  };
}

function roleFromServerKind(kind: DevelopmentServerKind): ProjectPortRole {
  if (kind === "frontend") return "frontend";
  if (kind === "backend") return "backend";
  if (kind === "fullStack") return "fullstack";
  return "other";
}

function detectedPortLabel(role: ProjectPortRole): string {
  if (role === "frontend") return "Frontend";
  if (role === "backend") return "Backend";
  if (role === "fullstack") return "Full stack";
  return "Local server";
}
