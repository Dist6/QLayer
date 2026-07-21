import { useCallback, useMemo, useState } from "react";

import { createProject, deleteProject, updateProject } from "./projectOperations";
import { createProjectStorage } from "./projectStorage";
import type { Project, ProjectCandidate } from "./projectTypes";

export type ProjectsState = {
  projects: Project[];
  warning?: string;
  create: (candidate: ProjectCandidate) => void;
  update: (id: string, candidate: ProjectCandidate) => void;
  remove: (id: string) => void;
};

export function useProjects(): ProjectsState {
  const storage = useMemo(() => createProjectStorage(window.localStorage), []);
  const loaded = useMemo(() => storage.load(), [storage]);
  const [projects, setProjects] = useState<Project[]>(loaded.projects);

  const apply = useCallback(
    (operation: (current: readonly Project[]) => Project[]) => {
      setProjects((current) => {
        const next = operation(current);
        storage.save(next);
        return next;
      });
    },
    [storage],
  );

  return {
    projects,
    ...(loaded.warning ? { warning: loaded.warning } : {}),
    create: (candidate) => apply((current) => createProject(current, candidate)),
    update: (id, candidate) => apply((current) => updateProject(current, id, candidate)),
    remove: (id) => apply((current) => deleteProject(current, id)),
  };
}
