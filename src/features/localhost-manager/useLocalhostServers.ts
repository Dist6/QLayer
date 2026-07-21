import { useCallback, useEffect, useRef, useState } from "react";

import type { LocalhostAutoRefreshSeconds } from "../settings/settingsTypes";
import { listLocalhostServers } from "./localhostManagerClient";
import type { LocalhostSnapshot } from "./localhostManagerTypes";
import {
  hasLocalhostTopologyChanged,
  isLocalhostSnapshotFresh,
} from "./localhostSnapshotStability";
import { useVisibleInterval } from "./useVisibleInterval";

let cachedSnapshot: LocalhostSnapshot | null = null;
let cachedSnapshotAtMs: number | null = null;

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
  const hadCachedSnapshotRef = useRef(cachedSnapshot !== null);
  const shouldRefreshOnMountRef = useRef(!isLocalhostSnapshotFresh(cachedSnapshotAtMs, Date.now()));
  const [snapshot, setSnapshot] = useState<LocalhostSnapshot | null>(cachedSnapshot);
  const [loading, setLoading] = useState(cachedSnapshot === null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const inFlightRef = useRef(false);

  const runRefresh = useCallback(async (showProgress: boolean) => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    if (showProgress) setRefreshing(true);
    try {
      const next = await listLocalhostServers();
      if (!mountedRef.current) return;
      cachedSnapshotAtMs = Date.now();
      if (showProgress || hasLocalhostTopologyChanged(cachedSnapshot, next)) {
        cachedSnapshot = next;
        setSnapshot(next);
      }
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
        if (showProgress) setRefreshing(false);
      }
    }
  }, []);

  const refresh = useCallback(() => runRefresh(true), [runRefresh]);

  useEffect(() => {
    mountedRef.current = true;
    if (shouldRefreshOnMountRef.current) {
      void runRefresh(!hadCachedSnapshotRef.current);
    }
    return () => {
      mountedRef.current = false;
    };
  }, [runRefresh]);

  useVisibleInterval(
    () => void runRefresh(false),
    autoRefreshSeconds === null ? null : autoRefreshSeconds * 1_000,
    true,
  );

  return { snapshot, loading, refreshing, error, refresh };
}
