import { useEffect, useRef } from "react";

export type PausableInterval = {
  pause: () => void;
  resume: () => void;
};

export function createPausableInterval(
  callback: () => void,
  delayMs: number,
  runOnResume: boolean,
): PausableInterval {
  let intervalId: ReturnType<typeof globalThis.setInterval> | undefined;
  let hasStarted = false;

  const pause = () => {
    if (intervalId === undefined) return;
    globalThis.clearInterval(intervalId);
    intervalId = undefined;
  };

  const resume = () => {
    if (intervalId !== undefined) return;
    if (hasStarted && runOnResume) callback();
    hasStarted = true;
    intervalId = globalThis.setInterval(callback, delayMs);
  };

  return { pause, resume };
}

export function useVisibleInterval(
  callback: () => void,
  delayMs: number | null,
  runOnResume = false,
): void {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delayMs === null || typeof window === "undefined" || typeof document === "undefined") {
      return;
    }

    const interval = createPausableInterval(() => callbackRef.current(), delayMs, runOnResume);
    const resume = () => {
      if (isWindowDocumentActive()) interval.resume();
    };
    const pause = () => interval.pause();
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") pause();
      else resume();
    };

    window.addEventListener("focus", resume);
    window.addEventListener("blur", pause);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    resume();

    return () => {
      pause();
      window.removeEventListener("focus", resume);
      window.removeEventListener("blur", pause);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [delayMs, runOnResume]);
}

export function isWindowDocumentActive(): boolean {
  if (typeof document === "undefined") return true;
  return document.visibilityState !== "hidden" && document.hasFocus();
}
