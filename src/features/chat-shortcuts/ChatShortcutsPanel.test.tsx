import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ChatShortcutsPanel } from "./ChatShortcutsPanel";
import type { ChatDestinationsState } from "./useChatDestinations";

const emptyState: ChatDestinationsState = {
  destinations: [],
  recentChats: [],
  discoveryAttempted: true,
  discoveryLoading: false,
  pin: () => undefined,
  remove: () => undefined,
  rename: () => undefined,
  move: () => undefined,
  refreshRecent: () => Promise.resolve(),
};

describe("ChatShortcutsPanel", () => {
  it("starts in the list view without mounting the add chat form", () => {
    const markup = renderToStaticMarkup(<ChatShortcutsPanel state={emptyState} />);

    expect(markup).toContain('aria-label="Chat shortcut actions"');
    expect(markup).toContain('aria-label="Add chat"');
    expect(markup).not.toContain('id="manual-chat-form"');
    expect(markup).not.toContain("Optional name");
    expect(markup).not.toContain("Paste chat ID");
  });
});
