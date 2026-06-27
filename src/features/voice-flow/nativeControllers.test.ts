import { describe, expect, it } from "vitest";

import { parseNativeKeyboardStep, parseNativeWindowStep } from "./nativeControllers";

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

describe("native window controller parsing", () => {
  it("accepts a focused Codex step", () => {
    expect(
      parseNativeWindowStep({
        status: "codexFocused",
        message: "Codex focused.",
      }),
    ).toEqual({
      ok: true,
      value: {
        status: "codexFocused",
        message: "Codex focused.",
      },
    });
  });

  it("accepts an unconfirmed Codex focus step", () => {
    expect(
      parseNativeWindowStep({
        status: "codexFocusNotConfirmed",
        message: "Codex opened, but focus could not be confirmed.",
      }),
    ).toEqual({
      ok: true,
      value: {
        status: "codexFocusNotConfirmed",
        message: "Codex opened, but focus could not be confirmed.",
      },
    });
  });

  it("rejects non-window native payloads", () => {
    expect(
      parseNativeWindowStep({
        status: "dictationSent",
        message: "Dictation shortcut sent.",
      }),
    ).toEqual({
      ok: false,
      reason: "failed",
      message: "Codex opened, but focus could not be confirmed.",
    });
  });
});
