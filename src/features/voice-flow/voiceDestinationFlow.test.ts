import { describe, expect, it } from "vitest";

import type { ChatDestination } from "../chat-shortcuts/chatDestinationTypes";
import {
  beginVoiceDestinationFlow,
  consumeVoiceDestinationSelection,
  releaseVoiceDestinationFlow,
  resolveVoiceDestination,
} from "./voiceDestinationFlow";

const destination: ChatDestination = {
  id: "saved",
  threadId: "019f72d8-d02e-75d1-9969-d6c5a647c95e",
  displayName: "Saved",
  order: 1,
  pinnedAt: "2026-07-18T00:00:00.000Z",
};

describe("Voice Flow destination state", () => {
  it("bypasses selection when no destinations are pinned", () => {
    expect(beginVoiceDestinationFlow(false)).toBe("starting");
    expect(beginVoiceDestinationFlow(true)).toBe("selecting");
  });

  it("consumes only the first selection and cancels on release", () => {
    expect(consumeVoiceDestinationSelection("selecting")).toEqual({
      accepted: true,
      phase: "starting",
    });
    expect(consumeVoiceDestinationSelection("starting")).toEqual({
      accepted: false,
      phase: "starting",
    });
    expect(releaseVoiceDestinationFlow("selecting")).toEqual({
      cancelledSelection: true,
      phase: "idle",
    });
  });

  it("resolves current and saved targets and rejects deleted destinations", () => {
    expect(resolveVoiceDestination([destination], { kind: "current" })).toEqual({
      kind: "current",
    });
    expect(
      resolveVoiceDestination([destination], { kind: "saved", destinationId: "saved" }),
    ).toEqual({ kind: "saved", threadId: destination.threadId });
    expect(resolveVoiceDestination([], { kind: "saved", destinationId: "deleted" })).toBeNull();
  });
});
