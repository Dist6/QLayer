import type { Project, ProjectCandidate } from "./projectTypes";
import { normalizeProjects, parseProject } from "./projectValidation";

export function createProject(
  current: readonly Project[],
  candidate: ProjectCandidate,
  now = new Date().toISOString(),
  id: string = crypto.randomUUID(),
): Project[] {
  const project = parseProject({ ...candidate, id, createdAt: now, updatedAt: now });
  return project ? normalizeProjects([project, ...current]) : normalizeProjects(current);
}

export function updateProject(
  current: readonly Project[],
  id: string,
  candidate: ProjectCandidate,
  now = new Date().toISOString(),
): Project[] {
  const existing = current.find((project) => project.id === id);
  if (!existing) return normalizeProjects(current);
  const project = parseProject({ ...candidate, id, createdAt: existing.createdAt, updatedAt: now });
  if (!project) return normalizeProjects(current);
  return normalizeProjects(current.map((item) => (item.id === id ? project : item)));
}

export function deleteProject(current: readonly Project[], id: string): Project[] {
  return normalizeProjects(current.filter((project) => project.id !== id));
}
