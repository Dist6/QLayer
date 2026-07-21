import { beforeEach, describe, expect, it, vi } from "vitest";

const tauri = vi.hoisted(() => ({
  emitTo: vi.fn(),
  invoke: vi.fn(),
  listen: vi.fn(),
}));

vi.mock("@tauri-apps/api/core", () => ({ invoke: tauri.invoke }));
vi.mock("@tauri-apps/api/event", () => ({ emitTo: tauri.emitTo, listen: tauri.listen }));

import { showVoiceSelector } from "./voiceSelectorClient";
import {
  VOICE_SELECTOR_CLOSED_EVENT,
  VOICE_SELECTOR_OPEN_EVENT,
  VOICE_SELECTOR_READY_EVENT,
} from "./voiceSelectorEvents";

describe("voice selector client", () => {
  const listeners = new Map<string, () => void>();
  const unlistenReady = vi.fn();
  const unlistenClosed = vi.fn();

  beforeEach(() => {
    listeners.clear();
    unlistenReady.mockReset();
    unlistenClosed.mockReset();
    tauri.emitTo.mockReset().mockResolvedValue(undefined);
    tauri.invoke.mockReset();
    tauri.listen
      .mockReset()
      .mockImplementation(async (eventName: string, handler: () => void): Promise<() => void> => {
        listeners.set(eventName, handler);
        return eventName === VOICE_SELECTOR_READY_EVENT ? unlistenReady : unlistenClosed;
      });
  });

  it("waits for a newly created selector before sending its destinations", async () => {
    tauri.invoke.mockResolvedValue(true);

    const request = showVoiceSelector([], []);
    await vi.waitFor(() => expect(tauri.invoke).toHaveBeenCalledWith("show_voice_selector"));
    expect(tauri.emitTo).not.toHaveBeenCalled();

    listeners.get(VOICE_SELECTOR_READY_EVENT)?.();
    await request;

    expect(tauri.emitTo).toHaveBeenCalledWith("voice-selector", VOICE_SELECTOR_OPEN_EVENT, {
      destinations: [],
      projects: [],
    });
    expect(unlistenReady).toHaveBeenCalledOnce();
    expect(unlistenClosed).toHaveBeenCalledOnce();
  });

  it("sends immediately when the selector already exists", async () => {
    tauri.invoke.mockResolvedValue(false);

    await showVoiceSelector([], []);

    expect(tauri.emitTo).toHaveBeenCalledWith("voice-selector", VOICE_SELECTOR_OPEN_EVENT, {
      destinations: [],
      projects: [],
    });
    expect(unlistenReady).toHaveBeenCalledOnce();
    expect(unlistenClosed).toHaveBeenCalledOnce();
  });

  it("does not send destinations when the hold is released during creation", async () => {
    tauri.invoke.mockResolvedValueOnce(true).mockResolvedValueOnce(undefined);

    const request = showVoiceSelector([], []);
    await vi.waitFor(() => expect(tauri.invoke).toHaveBeenCalledWith("show_voice_selector"));
    listeners.get(VOICE_SELECTOR_CLOSED_EVENT)?.();
    await request;

    expect(tauri.invoke).toHaveBeenLastCalledWith("hide_voice_selector");
    expect(tauri.emitTo).not.toHaveBeenCalled();
  });
});
