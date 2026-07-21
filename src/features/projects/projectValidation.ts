import { parseCodexThreadInput } from "../codex/deepLinks";
import type { Project, ProjectChatLink, ProjectPort, ProjectPortRole } from "./projectTypes";

export const MAX_PROJECT_NAME_LENGTH = 80;
export const MAX_PROJECT_CHAT_NAME_LENGTH = 80;
export const MAX_PROJECT_PORT_LABEL_LENGTH = 40;
export const MAX_PROJECTS = 100;
export const MAX_PROJECT_CHATS = 50;
export const MAX_PROJECT_PORTS = 20;

const PROJECT_PORT_ROLES: readonly ProjectPortRole[] = [
  "frontend",
  "backend",
  "fullstack",
  "database",
  "other",
];

export function parseProject(value: unknown): Project | null {
  if (!isRecord(value)) return null;

  const id = normalizeText(value.id, 100);
  const name = normalizeText(value.name, MAX_PROJECT_NAME_LENGTH);
  const rootPath = normalizePath(value.rootPath);
  const rootIdentity = normalizeRootIdentity(value.rootIdentity);
  const createdAt = normalizeIsoDate(value.createdAt);
  const updatedAt = normalizeIsoDate(value.updatedAt);

  if (
    !id ||
    !name ||
    !rootPath ||
    !rootIdentity ||
    !createdAt ||
    !updatedAt ||
    !Array.isArray(value.linkedChats) ||
    !Array.isArray(value.preferredPorts)
  ) {
    return null;
  }

  const linkedChats = value.linkedChats.map(parseProjectChatLink).filter(isChatLink);
  const preferredPorts = value.preferredPorts.map(parseProjectPort).filter(isProjectPort);
  if (
    linkedChats.length !== value.linkedChats.length ||
    preferredPorts.length !== value.preferredPorts.length ||
    linkedChats.length > MAX_PROJECT_CHATS ||
    preferredPorts.length > MAX_PROJECT_PORTS ||
    new Set(linkedChats.map((chat) => chat.threadId)).size !== linkedChats.length ||
    new Set(preferredPorts.map((port) => port.port)).size !== preferredPorts.length ||
    new Set(preferredPorts.map((port) => port.id)).size !== preferredPorts.length
  ) {
    return null;
  }

  const lastSelectedChatId = normalizeThreadId(value.lastSelectedChatId);
  if (
    value.lastSelectedChatId !== undefined &&
    (!lastSelectedChatId || !linkedChats.some((chat) => chat.threadId === lastSelectedChatId))
  ) {
    return null;
  }

  return {
    id,
    name,
    rootPath,
    rootIdentity,
    linkedChats,
    preferredPorts,
    ...(lastSelectedChatId ? { lastSelectedChatId } : {}),
    createdAt,
    updatedAt,
  };
}

export function normalizeProjects(values: readonly Project[]): Project[] {
  const uniqueIds = new Set<string>();
  const uniqueRoots = new Set<string>();
  const projects: Project[] = [];

  for (const value of values) {
    const project = parseProject(value);
    if (
      !project ||
      uniqueIds.has(project.id) ||
      uniqueRoots.has(project.rootIdentity) ||
      projects.length >= MAX_PROJECTS
    ) {
      continue;
    }
    uniqueIds.add(project.id);
    uniqueRoots.add(project.rootIdentity);
    projects.push(project);
  }

  return projects.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export function normalizeProjectName(value: string): string {
  return normalizeText(value, MAX_PROJECT_NAME_LENGTH);
}

export function normalizeProjectChatName(value: string): string {
  return normalizeText(value, MAX_PROJECT_CHAT_NAME_LENGTH);
}

export function normalizeProjectPortLabel(value: string): string {
  return normalizeText(value, MAX_PROJECT_PORT_LABEL_LENGTH);
}

function parseProjectChatLink(value: unknown): ProjectChatLink | null {
  if (!isRecord(value)) return null;
  const threadId = normalizeThreadId(value.threadId);
  const displayName = normalizeText(value.displayName, MAX_PROJECT_CHAT_NAME_LENGTH);
  const linkedAt = normalizeIsoDate(value.linkedAt);
  return threadId && displayName && linkedAt ? { threadId, displayName, linkedAt } : null;
}

function parseProjectPort(value: unknown): ProjectPort | null {
  if (!isRecord(value)) return null;
  const id = normalizeText(value.id, 100);
  const label = normalizeText(value.label, MAX_PROJECT_PORT_LABEL_LENGTH);
  const role = PROJECT_PORT_ROLES.includes(value.role as ProjectPortRole)
    ? (value.role as ProjectPortRole)
    : null;
  const port = value.port;
  if (
    !id ||
    !label ||
    !role ||
    typeof port !== "number" ||
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65_535 ||
    typeof value.strict !== "boolean"
  ) {
    return null;
  }
  return { id, label, role, port, strict: value.strict };
}

function normalizeThreadId(value: unknown): string {
  if (typeof value !== "string") return "";
  const parsed = parseCodexThreadInput(value);
  return parsed.ok ? parsed.threadId : "";
}

function normalizeText(value: unknown, limit: number): string {
  if (typeof value !== "string" || [...value].some((character) => character < " ")) return "";
  return value.trim().replace(/\s+/g, " ").slice(0, limit);
}

function normalizePath(value: unknown): string {
  if (typeof value !== "string") return "";
  const path = value.trim();
  if (!path || path.length > 520 || [...path].some((character) => character < " ")) return "";
  return path;
}

function normalizeRootIdentity(value: unknown): string {
  return typeof value === "string" && /^project-[0-9a-f]{16}$/.test(value) ? value : "";
}

function normalizeIsoDate(value: unknown): string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value)) ? value : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isChatLink(value: ProjectChatLink | null): value is ProjectChatLink {
  return value !== null;
}

function isProjectPort(value: ProjectPort | null): value is ProjectPort {
  return value !== null;
}
