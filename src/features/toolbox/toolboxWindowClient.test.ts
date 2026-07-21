import { beforeEach, describe, expect, it, vi } from "vitest";

const tauri = vi.hoisted(() => ({
  invoke: vi.fn(),
  isTauri: vi.fn(),
}));

vi.mock("@tauri-apps/api/core", () => tauri);

import { hideToolboxWindow } from "./toolboxWindowClient";

describe("toolbox window client", () => {
  beforeEach(() => {
    tauri.invoke.mockReset();
    tauri.isTauri.mockReset();
  });

  it("uses the narrow native hide command in the desktop app", async () => {
    tauri.isTauri.mockReturnValue(true);
    tauri.invoke.mockResolvedValue(undefined);

    await hideToolboxWindow();

    expect(tauri.invoke).toHaveBeenCalledWith("hide_main_window");
  });

  it("does nothing in the browser preview", async () => {
    tauri.isTauri.mockReturnValue(false);

    await hideToolboxWindow();

    expect(tauri.invoke).not.toHaveBeenCalled();
  });
});
