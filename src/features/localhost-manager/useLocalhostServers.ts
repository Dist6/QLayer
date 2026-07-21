import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useCallback, useEffect, useRef, useState } from "react";

import type { LocalhostAutoRefreshSeconds } from "../settings/settingsTypes";
import { listLocalhostServers } from "./localhostManagerClient";
import type { LocalhostSnapshot } from "./localhostManagerTypes";

export type LocalhostServersState = {
  snapshot: LocalhostSnapshot | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

export function useLocalhostServers(
  autoRefreshSeconds: LocalhostAutoRefreshSeconds,
): LocalhostServersState {
  const [snapshot, setSnapshot] = useState<LocalhostSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const inFlightRef = useRef(false);

  const refresh = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setRefreshing(true);
    try {
      const next = await listLocalhostServers();
      if (!mountedRef.current) return;
      setSnapshot(next);
      setError(null);
    } catch (reason) {
      if (!mountedRef.current) return;
      setError(
        typeof reason === "string"
          ? reason
          : reason instanceof Error
            ? reason.message
            : "Local development servers could not be inspected.",
      );
    } finally {
      inFlightRef.current = false;
      if (mountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void refresh();
    return () => {
      mountedRef.current = false;
    };
  }, [refresh]);

  useEffect(() => {
    if (autoRefreshSeconds === null) return;
    const interval = globalThis.setInterval(() => {
      void refreshWhenVisible(refresh);
    }, autoRefreshSeconds * 1_000);
    return () => globalThis.clearInterval(interval);
  }, [autoRefreshSeconds, refresh]);

  return { snapshot, loading, refreshing, error, refresh };
}

async function refreshWhenVisible(refresh: () => Promise<void>): Promise<void> {
  if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
  if (isTauri()) {
    try {
      if (!(await getCurrentWindow().isVisible())) return;
    } catch {
      return;
    }
  }
  await refresh();
}
