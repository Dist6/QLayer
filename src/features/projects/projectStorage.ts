import type { Project } from "./projectTypes";
import { normalizeProjects, parseProject } from "./projectValidation";

export const PROJECT_STORAGE_KEY = "qolayer.projects.v0";

export type ProjectStorageLoad = {
  projects: Project[];
  warning?: string;
};

export type ProjectStorage = {
  load: () => ProjectStorageLoad;
  save: (projects: readonly Project[]) => void;
};

export function createProjectStorage(storage: Storage): ProjectStorage {
  return {
    load: () => {
      const raw = storage.getItem(PROJECT_STORAGE_KEY);
      if (!raw) return { projects: [] };
      try {
        const envelope: unknown = JSON.parse(raw);
        if (!isRecord(envelope) || envelope.version !== 0 || !Array.isArray(envelope.projects)) {
          return storageWarning();
        }
        const parsed = envelope.projects.map(parseProject);
        const projects = normalizeProjects(parsed.filter(isProject));
        return parsed.length === projects.length
          ? { projects }
          : { projects, warning: "Some saved Projects could not be loaded." };
      } catch {
        return storageWarning();
      }
    },
    save: (projects) => {
      storage.setItem(
        PROJECT_STORAGE_KEY,
        JSON.stringify({ version: 0, projects: normalizeProjects(projects) }),
      );
    },
  };
}

function storageWarning(): ProjectStorageLoad {
  return { projects: [], warning: "Saved Projects could not be loaded." };
}

function isProject(value: Project | null): value is Project {
  return value !== null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
