export type StartupSplashPhase = "visible" | "exiting" | "hidden";

export type StartupSplashTiming = {
  visibleMs: number;
  exitMs: number;
};

const DEFAULT_TIMING: StartupSplashTiming = { visibleMs: 1400, exitMs: 360 };
const REDUCED_MOTION_TIMING: StartupSplashTiming = { visibleMs: 450, exitMs: 0 };

export function getStartupSplashTiming(reducedMotion: boolean): StartupSplashTiming {
  return reducedMotion ? REDUCED_MOTION_TIMING : DEFAULT_TIMING;
}
