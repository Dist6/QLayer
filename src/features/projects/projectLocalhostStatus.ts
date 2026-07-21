import type {
  DevelopmentServerKind,
  LocalhostServer,
  LocalhostSnapshot,
} from "../localhost-manager/localhostManagerTypes";
import type { Project, ProjectPortRole } from "./projectTypes";

export type ProjectPortState =
  | { kind: "checking" }
  | { kind: "running"; server: LocalhostServer }
  | { kind: "missing" }
  | { kind: "conflict"; server: LocalhostServer }
  | { kind: "unverified"; server: LocalhostServer }
  | { kind: "alternate"; server: LocalhostServer };

export function deriveProjectPortStates(
  project: Pick<Project, "rootIdentity" | "preferredPorts">,
  snapshot: LocalhostSnapshot | null,
  checking: boolean,
): ReadonlyMap<string, ProjectPortState> {
  return new Map<string, ProjectPortState>(
    project.preferredPorts.map((preferred): [string, ProjectPortState] => {
      if (checking) return [preferred.id, { kind: "checking" }] as const;
      const exact = snapshot?.servers.find(
        (server) => server.isRunning && server.port === preferred.port,
      );
      if (exact) {
        if (exact.projectId === project.rootIdentity) {
          return [preferred.id, { kind: "running", server: exact }] as const;
        }
        return [
          preferred.id,
          exact.projectId
            ? ({ kind: "conflict", server: exact } as const)
            : ({ kind: "unverified", server: exact } as const),
        ] as const;
      }
      if (!preferred.strict) {
        const alternate = snapshot?.servers.find(
          (server) =>
            server.isRunning &&
            server.projectId === project.rootIdentity &&
            roleMatchesKind(preferred.role, server.kind),
        );
        if (alternate) return [preferred.id, { kind: "alternate", server: alternate }] as const;
      }
      return [preferred.id, { kind: "missing" }] as const;
    }),
  );
}

function roleMatchesKind(role: ProjectPortRole, kind: DevelopmentServerKind): boolean {
  if (role === "frontend") return kind === "frontend" || kind === "fullStack";
  if (role === "backend") return kind === "backend" || kind === "fullStack";
  if (role === "fullstack") return kind === "fullStack";
  return true;
}
