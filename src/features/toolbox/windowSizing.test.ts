import { describe, expect, it } from "vitest";

import { TOOLBOX_WINDOW_HEIGHT, TOOLBOX_WINDOW_WIDTH } from "./windowSizing";

describe("toolbox window sizing", () => {
  it("keeps the approved fixed tray dimensions", () => {
    expect(TOOLBOX_WINDOW_WIDTH).toBe(480);
    expect(TOOLBOX_WINDOW_HEIGHT).toBe(464);
  });
});
