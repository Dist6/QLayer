import { describe, expect, it } from "vitest";

import { parseNativeKeyboardStep } from "./nativeControllers";

describe("native keyboard controller parsing", () => {
  it("accepts a successful dictation shortcut step", () => {
    expect(
      parseNativeKeyboardStep({
        status: "dictationSent",
        message: "Dictation shortcut sent.",
      }),
    ).toEqual({
      ok: true,
      value: {
        status: "dictationSent",
        message: "Dictation shortcut sent.",
      },
    });
  });

  it("rejects unsupported native keyboard payloads", () => {
    expect(
      parseNativeKeyboardStep({
        status: "codexOpened",
        message: "Codex opened.",
      }),
    ).toEqual({
      ok: false,
      reason: "failed",
      message: "Dictation shortcut could not be sent.",
    });
  });
});
