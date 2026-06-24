import { describe, expect, it } from "vitest";

import type { VoiceFlowStep } from "./controllers";
import { readVoiceFlowMessages } from "./voiceFlowStatus";

describe("Voice Flow status messages", () => {
  it("keeps only short human messages after a Voice Flow run", () => {
    const steps: VoiceFlowStep[] = [
      { status: "audioDisabled", message: "Audio control is disabled." },
      { status: "openingCodex", message: "Opening Codex." },
      { status: "codexOpened", message: "Codex opened." },
      { status: "audioUnavailable", message: "Audio is not implemented yet." },
      {
        status: "dictationUnavailable",
        message: "Dictation automation is not implemented yet.",
      },
      {
        status: "ready",
        message: "Codex opened. Audio and dictation are not implemented yet.",
      },
    ];

    expect(readVoiceFlowMessages(steps)).toEqual([
      "Codex opened.",
      "Audio is not implemented yet.",
      "Dictation automation is not implemented yet.",
    ]);
  });

  it("uses a compact restore audio message", () => {
    expect(
      readVoiceFlowMessages([
        { status: "audioUnavailable", message: "Audio restore is not implemented yet." },
      ]),
    ).toEqual(["Audio restore is not implemented yet."]);
  });
});
