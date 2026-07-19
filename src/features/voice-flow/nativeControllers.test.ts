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

  it("accepts dictation hold steps", () => {
    expect(
      parseNativeKeyboardStep({
        status: "dictationStarted",
        message: "Dictation shortcut is held.",
      }),
    ).toEqual({
      ok: true,
      value: {
        status: "dictationStarted",
        message: "Dictation shortcut is held.",
      },
    });

    expect(
      parseNativeKeyboardStep({
        status: "dictationStopped",
        message: "Dictation shortcut released.",
      }),
    ).toEqual({
      ok: true,
      value: {
        status: "dictationStopped",
        message: "Dictation shortcut released.",
      },
    });
  });

  it("rejects unsupported native keyboard payloads", () => {
    expect(
      parseNativeKeyboardStep({
        status: "focusingCodex",
        message: "Looking for Codex.",
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
        message: "Codex could not be focused.",
      }),
    ).toEqual({
      ok: true,
      value: {
        status: "codexFocusNotConfirmed",
        message: "Codex could not be focused.",
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
      message: "Codex could not be focused.",
    });
  });

  it("rejects malformed targeted focus payloads", () => {
    expect(parseNativeWindowStep({ status: "codexFocused" })).toEqual({
      ok: false,
      reason: "failed",
      message: "Codex could not be focused.",
    });
  });
});
