export type ToolboxView =
  | "voiceFlow"
  | "localhostManager"
  | "chatShortcuts"
  | "savedPrompts"
  | "settings";

export const toolboxViews = [
  { id: "voiceFlow", label: "Voice Flow" },
  { id: "localhostManager", label: "Localhost Manager" },
  { id: "chatShortcuts", label: "Chat shortcuts" },
  { id: "savedPrompts", label: "Saved prompts" },
] as const satisfies ReadonlyArray<{ id: ToolboxView; label: string }>;
