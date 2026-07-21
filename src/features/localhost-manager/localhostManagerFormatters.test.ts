import { describe, expect, it } from "vitest";

import { formatCpu, formatMemory, formatUptime, kindLabel } from "./localhostManagerFormatters";

describe("localhost manager formatters", () => {
  it("formats memory without noisy precision", () => {
    expect(formatMemory(184_000_000)).toBe("184 MB");
    expect(formatMemory(null)).toBeNull();
  });

  it.each([
    [42 * 60, "42m"],
    [2 * 3600 + 18 * 60, "2h 18m"],
    [3 * 86400 + 4 * 3600, "3d 4h"],
  ])("formats %i seconds as %s", (seconds, expected) => {
    expect(formatUptime(seconds)).toBe(expected);
  });

  it("formats optional CPU and conservative kind labels", () => {
    expect(formatCpu(2.34)).toBe("2.3% CPU");
    expect(formatCpu(null)).toBeNull();
    expect(kindLabel("unknown")).toBe("Dev server");
  });
});
