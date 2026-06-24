import { invoke } from "@tauri-apps/api/core";

import { failed, type AppResult } from "../../shared/result";
import {
  buildCodexHomeLink,
  buildCodexNewThreadLink,
  buildCodexSettingsLink,
  isAllowedCodexLink,
} from "./deepLinks";

export type CodexAction = "home" | "settings" | "newThread";

export async function openCodexAction(action: CodexAction): Promise<AppResult<void>> {
  const url = getCodexActionUrl(action);

  if (!isAllowedCodexLink(url)) {
    return failed("QoLayer blocked an unsupported Codex link.");
  }

  try {
    await invoke("open_codex_url", { url });
    return { ok: true, value: undefined };
  } catch (error) {
    return failed(readErrorMessage(error));
  }
}

function getCodexActionUrl(action: CodexAction): string {
  switch (action) {
    case "home":
      return buildCodexHomeLink();
    case "settings":
      return buildCodexSettingsLink();
    case "newThread":
      return buildCodexNewThreadLink();
  }
}

function readErrorMessage(error: unknown): string {
  return typeof error === "string"
    ? error
    : "Codex could not be opened. Make sure Codex is installed and deep links are enabled.";
}
