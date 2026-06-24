export function buildCodexHomeLink(): string {
  return "codex://";
}

export function buildCodexSettingsLink(): string {
  return "codex://settings";
}

export function buildCodexNewThreadLink(): string {
  return "codex://threads/new";
}

export function isAllowedCodexLink(url: string): boolean {
  return (
    url === buildCodexHomeLink() ||
    url === buildCodexSettingsLink() ||
    url === buildCodexNewThreadLink()
  );
}
