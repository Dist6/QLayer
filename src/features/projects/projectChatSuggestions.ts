import type { ChatDestination } from "../chat-shortcuts/chatDestinationTypes";
import type { RecentChat } from "../chat-shortcuts/chatDiscoveryClient";
import type { Project } from "./projectTypes";

export type ProjectChatSuggestion = {
  threadId: string;
  displayName: string;
  projectName?: string;
  source: "saved" | "recent";
  matchesProject: boolean;
  updatedAt?: string;
};

export function suggestProjectChats(
  project: Pick<Project, "rootIdentity" | "linkedChats">,
  saved: readonly ChatDestination[],
  recent: readonly RecentChat[],
): ProjectChatSuggestion[] {
  const linked = new Set(project.linkedChats.map((chat) => chat.threadId));
  const suggestions = new Map<string, ProjectChatSuggestion>();

  for (const destination of saved) {
    if (linked.has(destination.threadId)) continue;
    suggestions.set(destination.threadId, {
      threadId: destination.threadId,
      displayName: destination.displayName,
      ...(destination.projectName ? { projectName: destination.projectName } : {}),
      source: "saved",
      matchesProject: false,
    });
  }

  for (const chat of recent) {
    if (linked.has(chat.threadId)) continue;
    const existing = suggestions.get(chat.threadId);
    const matchesProject = chat.projectId === project.rootIdentity;
    suggestions.set(chat.threadId, {
      threadId: chat.threadId,
      displayName: existing?.displayName ?? chat.title,
      ...(chat.projectName
        ? { projectName: chat.projectName }
        : existing?.projectName
          ? { projectName: existing.projectName }
          : {}),
      source: existing?.source ?? "recent",
      matchesProject,
      ...(chat.updatedAt ? { updatedAt: chat.updatedAt } : {}),
    });
  }

  return [...suggestions.values()].sort(
    (left, right) =>
      Number(right.matchesProject) - Number(left.matchesProject) ||
      (right.updatedAt ?? "").localeCompare(left.updatedAt ?? "") ||
      left.displayName.localeCompare(right.displayName),
  );
}
