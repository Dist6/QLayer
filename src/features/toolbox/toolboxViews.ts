export type ToolboxView = "voiceFlow" | "chatShortcuts" | "savedPrompts" | "settings";

export const toolboxViews = [
  { id: "voiceFlow", label: "Voice Flow" },
  { id: "chatShortcuts", label: "Chat shortcuts" },
  { id: "savedPrompts", label: "Saved prompts" },
] as const satisfies ReadonlyArray<{ id: ToolboxView; label: string }>;
