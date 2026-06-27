import { describe, expect, it } from "vitest";

import type { VoiceFlowStep } from "./controllers";
import { readVoiceFlowMessages } from "./voiceFlowStatus";

describe("Voice Flow status messages", () => {
  it("keeps only short human messages after a Voice Flow run", () => {
    const steps: VoiceFlowStep[] = [
      { status: "audioDucked", message: "Audio lowered." },
      { status: "openingCodex", message: "Opening Codex." },
      { status: "codexOpened", message: "Codex opened." },
      {
        status: "dictationSent",
        message: "Dictation shortcut sent.",
      },
      {
        status: "ready",
        message: "Audio lowered. Codex opened. Dictation shortcut sent.",
      },
    ];

    expect(readVoiceFlowMessages(steps)).toEqual([
      "Audio lowered.",
      "Codex opened.",
      "Dictation shortcut sent.",
    ]);
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

  it("uses a compact restore audio message", () => {
    expect(
      readVoiceFlowMessages([{ status: "nothingToRestore", message: "Nothing to restore." }]),
    ).toEqual(["Nothing to restore."]);
  });
});
