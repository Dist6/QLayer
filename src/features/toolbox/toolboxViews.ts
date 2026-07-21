export type ToolboxView =
  | "voiceFlow"
  | "localhostManager"
  | "projects"
  | "chatShortcuts"
  | "savedPrompts"
  | "settings";

export const toolboxViews = [
  { id: "voiceFlow", label: "Voice Flow" },
  { id: "localhostManager", label: "Localhost Manager" },
  { id: "projects", label: "Projects" },
  { id: "chatShortcuts", label: "Chat shortcuts" },
  { id: "savedPrompts", label: "Saved prompts" },
] as const satisfies ReadonlyArray<{ id: ToolboxView; label: string }>;
