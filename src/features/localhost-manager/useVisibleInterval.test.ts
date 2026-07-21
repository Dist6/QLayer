import { afterEach, describe, expect, it, vi } from "vitest";

import { createPausableInterval } from "./useVisibleInterval";

describe("pausable interval", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not run while paused and resumes with one immediate refresh", () => {
    vi.useFakeTimers();
    const callback = vi.fn();
    const interval = createPausableInterval(callback, 1_000, true);

    interval.resume();
    vi.advanceTimersByTime(2_000);
    expect(callback).toHaveBeenCalledTimes(2);

    interval.pause();
    vi.advanceTimersByTime(3_000);
    expect(callback).toHaveBeenCalledTimes(2);

    interval.resume();
    expect(callback).toHaveBeenCalledTimes(3);
    vi.advanceTimersByTime(1_000);
    expect(callback).toHaveBeenCalledTimes(4);

    interval.pause();
  });

  it("does not create duplicate timers when resumed repeatedly", () => {
    vi.useFakeTimers();
    const callback = vi.fn();
    const interval = createPausableInterval(callback, 1_000, false);

    interval.resume();
    interval.resume();
    vi.advanceTimersByTime(1_000);

    expect(callback).toHaveBeenCalledOnce();
    interval.pause();
  });
});
