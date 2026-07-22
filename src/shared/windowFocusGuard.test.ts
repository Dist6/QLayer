import { describe, expect, it } from "vitest";

import {
  isWindowDismissSuspended,
  suspendWindowDismiss,
  withWindowDismissSuspended,
} from "./windowFocusGuard";

describe("window focus guard", () => {
  it("suspends dismissal only while a native interaction is active", async () => {
    expect(isWindowDismissSuspended()).toBe(false);

    await withWindowDismissSuspended(async () => {
      expect(isWindowDismissSuspended()).toBe(true);
    });

    expect(isWindowDismissSuspended()).toBe(false);
  });

  it("always releases the suspension after a failure", async () => {
    await expect(
      withWindowDismissSuspended(async () => {
        throw new Error("dialog failed");
      }),
    ).rejects.toThrow("dialog failed");

    expect(isWindowDismissSuspended()).toBe(false);
  });

  it("keeps dismissal suspended until every active interaction releases it", () => {
    const releaseFirst = suspendWindowDismiss();
    const releaseSecond = suspendWindowDismiss();

    releaseFirst();
    expect(isWindowDismissSuspended()).toBe(true);

    releaseSecond();
    releaseSecond();
    expect(isWindowDismissSuspended()).toBe(false);
  });
});
