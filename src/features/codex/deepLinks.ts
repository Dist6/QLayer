export function buildCodexHomeLink(): string {
  return "codex://";
}

export function buildCodexSettingsLink(): string {
  return "codex://settings";
}

export function buildCodexNewThreadLink(): string {
  return "codex://threads/new";
}

export type CodexThreadParseResult =
  | { ok: true; threadId: string }
  | { ok: false; message: string };

const THREAD_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const THREAD_LINK_PREFIX = "codex://threads/";

export function parseCodexThreadInput(value: string): CodexThreadParseResult {
  const normalized = value.trim();
  const candidate = normalized.startsWith(THREAD_LINK_PREFIX)
    ? normalized.slice(THREAD_LINK_PREFIX.length)
    : normalized;

  if (!THREAD_ID_PATTERN.test(candidate)) {
    return {
      ok: false,
      message: "Enter a valid Codex chat ID or codex://threads/ link.",
    };
  }

  return { ok: true, threadId: candidate.toLowerCase() };
}

export function buildCodexThreadLink(threadId: string): string {
  const parsed = parseCodexThreadInput(threadId);
  if (!parsed.ok || threadId.trim().startsWith(THREAD_LINK_PREFIX)) {
    throw new Error("A valid Codex thread ID is required.");
  }

  return `${THREAD_LINK_PREFIX}${parsed.threadId}`;
}

export function isAllowedCodexLink(url: string): boolean {
  const thread = parseCodexThreadInput(url);
  return (
    url === buildCodexHomeLink() ||
    url === buildCodexSettingsLink() ||
    url === buildCodexNewThreadLink() ||
    (thread.ok && url === buildCodexThreadLink(thread.threadId))
  );
}
