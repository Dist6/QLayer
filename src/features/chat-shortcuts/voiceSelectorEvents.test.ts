import { describe, expect, it } from "vitest";

import type { ChatDestination } from "./chatDestinationTypes";
import {
  getVoiceSelectorKeyAction,
  getVoiceSelectorNumber,
  parseVoiceSelectorOpenPayload,
  parseVoiceSelectorSelection,
} from "./voiceSelectorEvents";

const destination: ChatDestination = {
  id: "saved",
  threadId: "019f72d8-d02e-75d1-9969-d6c5a647c95e",
  displayName: "Saved",
  order: 1,
  pinnedAt: "2026-07-18T00:00:00.000Z",
};

const project = {
  id: "project",
  name: "QLayer",
  chats: [{ threadId: destination.threadId, displayName: "Project chat" }],
};

describe("voice selector events", () => {
  it("maps digit, numpad, current, and cancel keys", () => {
    expect(getVoiceSelectorKeyAction("Digit0", [destination])).toEqual({ kind: "current" });
    expect(getVoiceSelectorKeyAction("Numpad1", [destination])).toEqual({
      kind: "saved",
      destinationId: "saved",
    });
    expect(getVoiceSelectorKeyAction("Digit9", [destination])).toBeNull();
    expect(getVoiceSelectorKeyAction("Escape", [destination])).toEqual({ kind: "cancel" });
    expect(getVoiceSelectorKeyAction("Space", [destination])).toBeNull();
    expect(getVoiceSelectorNumber("Digit3")).toBe(3);
    expect(getVoiceSelectorNumber("KeyP")).toBeNull();
  });

  it("validates open and selection payloads", () => {
    expect(
      parseVoiceSelectorOpenPayload({ destinations: [destination], projects: [project] }),
    ).toEqual({
      destinations: [destination],
      projects: [project],
    });
    expect(
      parseVoiceSelectorOpenPayload({
        destinations: [{ ...destination, order: 10 }],
        projects: [],
      }),
    ).toBeNull();
    expect(parseVoiceSelectorSelection({ kind: "current" })).toEqual({ kind: "current" });
    expect(parseVoiceSelectorSelection({ kind: "saved", destinationId: "saved" })).toEqual({
      kind: "saved",
      destinationId: "saved",
    });
    expect(parseVoiceSelectorSelection({ kind: "saved" })).toBeNull();
    expect(
      parseVoiceSelectorSelection({ kind: "projectChat", threadId: destination.threadId }),
    ).toEqual({ kind: "projectChat", threadId: destination.threadId });
    expect(
      parseVoiceSelectorOpenPayload({ destinations: [], projects: [{ ...project, chats: [] }] }),
    ).toEqual({
      destinations: [],
      projects: [{ ...project, chats: [] }],
    });
  });
});
