import type { DevelopmentServerKind } from "./localhostManagerTypes";

export function formatMemory(bytes: number | null): string | null {
  if (bytes === null) return null;
  if (bytes < 1_000_000) return `${Math.max(1, Math.round(bytes / 1_000))} KB`;
  return `${Math.round(bytes / 1_000_000)} MB`;
}

export function formatUptime(seconds: number | null): string | null {
  if (seconds === null) return null;
  const totalMinutes = Math.max(0, Math.floor(seconds / 60));
  if (totalMinutes < 60) return `${totalMinutes}m`;

  const totalHours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (totalHours < 24) return minutes > 0 ? `${totalHours}h ${minutes}m` : `${totalHours}h`;

  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
}

export function formatCpu(percent: number | null): string | null {
  if (percent === null) return null;
  return `${percent < 10 ? percent.toFixed(1) : Math.round(percent)}% CPU`;
}

export function kindLabel(kind: DevelopmentServerKind): string {
  switch (kind) {
    case "frontend":
      return "Frontend";
    case "backend":
      return "Backend";
    case "fullStack":
      return "Full-stack";
    case "unknown":
      return "Dev server";
  }
}

export function accessibleUptime(seconds: number | null): string | null {
  const compact = formatUptime(seconds);
  return compact ? `Running for ${compact}` : null;
}
