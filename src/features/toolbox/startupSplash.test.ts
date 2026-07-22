import { describe, expect, it } from "vitest";

import { getStartupSplashTiming } from "./startupSplash";

describe("startup splash timing", () => {
  it("keeps the branded entrance brief", () => {
    expect(getStartupSplashTiming(false)).toEqual({ visibleMs: 1400, exitMs: 360 });
  });

  it("removes the fade when reduced motion is requested", () => {
    expect(getStartupSplashTiming(true)).toEqual({ visibleMs: 450, exitMs: 0 });
  });
});
