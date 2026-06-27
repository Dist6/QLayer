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
        status: "dictationUnavailable",
        message: "Dictation automation is not implemented yet.",
      },
      {
        status: "ready",
        message: "Audio lowered. Codex opened. Dictation automation is not implemented yet.",
      },
    ];

    expect(readVoiceFlowMessages(steps)).toEqual([
      "Audio lowered.",
      "Codex opened.",
      "Dictation automation is not implemented yet.",
    ]);
  });

  it("uses a compact restore audio message", () => {
    expect(
      readVoiceFlowMessages([{ status: "nothingToRestore", message: "Nothing to restore." }]),
    ).toEqual(["Nothing to restore."]);
  });
});
