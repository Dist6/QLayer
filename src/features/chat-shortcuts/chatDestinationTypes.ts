export type ChatDestination = {
  id: string;
  threadId: string;
  displayName: string;
  projectName?: string;
  order: number;
  pinnedAt: string;
};

export type ChatDestinationCandidate = Omit<ChatDestination, "id" | "order" | "pinnedAt"> & {
  id?: string;
  pinnedAt?: string;
};
