import { describe, expect, it } from "vitest";

import { getVoiceFlowDisplayStatus } from "./voiceFlowPresentation";

describe("Voice Flow display status", () => {
  it("shows availability checks without claiming Voice Flow is ready", () => {
    expect(getVoiceFlowDisplayStatus({ status: "checkingCodex", message: "Checking." })).toEqual({
      label: "Checking",
      tone: "checking",
    });
  });

  it("states clearly when Codex or ChatGPT is not detected", () => {
    expect(
      getVoiceFlowDisplayStatus({
        status: "waitingForCodex",
        message: "Codex or ChatGPT is not open.",
      }),
    ).toEqual({
      label: "Not detected",
      tone: "attention",
      message: "Codex or ChatGPT is not open.",
    });
  });

  it("keeps focus failures separate from an unavailable app", () => {
    expect(
      getVoiceFlowDisplayStatus({
        status: "codexFocusNotConfirmed",
        message: "ChatGPT was detected, but Windows did not allow it to become active.",
      }),
    ).toEqual({
      label: "Needs attention",
      tone: "attention",
      message: "ChatGPT was detected, but Windows did not allow it to become active.",
    });
  });

  it("shows listening and ready states compactly", () => {
    expect(
      getVoiceFlowDisplayStatus({ status: "dictationStarted", message: "Listening." }),
    ).toEqual({ label: "Listening", tone: "listening" });
    expect(getVoiceFlowDisplayStatus({ status: "ready", message: "Ready." })).toEqual({
      label: "Ready",
      tone: "ready",
    });
  });
});
