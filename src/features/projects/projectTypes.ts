export type ProjectPortRole = "frontend" | "backend" | "fullstack" | "database" | "other";

export type ProjectPort = {
  id: string;
  label: string;
  role: ProjectPortRole;
  port: number;
  strict: boolean;
};

export type ProjectChatLink = {
  threadId: string;
  displayName: string;
  linkedAt: string;
};

export type Project = {
  id: string;
  name: string;
  rootPath: string;
  rootIdentity: string;
  linkedChats: ProjectChatLink[];
  preferredPorts: ProjectPort[];
  lastSelectedChatId?: string;
  createdAt: string;
  updatedAt: string;
};

export type ProjectCandidate = Omit<Project, "id" | "createdAt" | "updatedAt">;
