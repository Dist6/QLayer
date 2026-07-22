import { describe, expect, it } from "vitest";

import type { VoiceFlowStep } from "./controllers";
import { readVoiceFlowMessages } from "./voiceFlowStatus";

describe("Voice Flow status messages", () => {
  it("keeps only short human messages after a Voice Flow run", () => {
    const steps: VoiceFlowStep[] = [
      { status: "audioDucked", message: "Audio lowered." },
      { status: "focusingCodex", message: "Looking for Codex." },
      { status: "codexFocused", message: "Codex focused." },
      {
        status: "dictationSent",
        message: "Dictation shortcut sent.",
      },
      {
        status: "ready",
        message: "Audio lowered. Codex focused. Dictation shortcut sent.",
      },
    ];

    expect(readVoiceFlowMessages(steps)).toEqual([
      "Audio lowered.",
      "Codex focused.",
      "Dictation shortcut sent.",
    ]);
  });

  it("uses a short message when Codex focus is not confirmed", () => {
    expect(
      readVoiceFlowMessages([
        {
          status: "codexFocusNotConfirmed",
          message: "Codex could not be focused.",
        },
      ]),
    ).toEqual(["Codex could not be focused."]);
  });

  it("shows the Codex recovery instruction", () => {
    expect(
      readVoiceFlowMessages([
        {
          status: "waitingForCodex",
          message: "Waiting for Codex. Open Codex, then hold Ctrl+Win again.",
        },
      ]),
    ).toEqual(["Codex or ChatGPT isn't open."]);
  });

  it("uses a short unavailable message for dictation automation", () => {
    expect(
      readVoiceFlowMessages([
        {
          status: "dictationUnavailable",
          message: "Dictation automation is not available.",
        },
      ]),
    ).toEqual(["Dictation automation is not available."]);
  });

  it("uses short push-to-talk dictation messages", () => {
    expect(
      readVoiceFlowMessages([
        {
          status: "dictationStarted",
          message: "Dictation shortcut is held.",
        },
        {
          status: "dictationStopped",
          message: "Dictation shortcut released.",
        },
      ]),
    ).toEqual(["Dictation is listening.", "Dictation shortcut released."]);
  });

  it("uses a compact restore audio message", () => {
    expect(
      readVoiceFlowMessages([{ status: "nothingToRestore", message: "Nothing to restore." }]),
    ).toEqual(["Nothing to restore."]);
  });
});
