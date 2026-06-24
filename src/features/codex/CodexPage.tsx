import { ExternalLink, MessageSquarePlus, Settings } from "lucide-react";
import { useState } from "react";

import { Button } from "../../shared/ui/Button";
import { PageHeader } from "../../shared/ui/PageHeader";
import { StatusChip } from "../../shared/ui/StatusChip";
import { openCodexAction, type CodexAction } from "./codexController";

export function CodexPage() {
  const [message, setMessage] = useState("Ready.");
  const [busyAction, setBusyAction] = useState<CodexAction | null>(null);

  const runAction = async (action: CodexAction) => {
    setBusyAction(action);
    setMessage("Opening Codex.");

    const result = await openCodexAction(action);

    setBusyAction(null);
    setMessage(result.ok ? "Request sent to Codex." : result.message);
  };

  return (
    <section className="page">
      <PageHeader
        title="Codex"
        description="Codex integration is limited to safe deep links in v0.1. QoLayer does not read Codex credentials, auth files, cookies, or network traffic."
      />

      <article className="card stack">
        <StatusChip
          tone={message.startsWith("Request") || message === "Ready." ? "success" : "danger"}
        >
          {message}
        </StatusChip>
        <div className="button-row">
          <Button
            disabled={busyAction !== null}
            onClick={() => void runAction("home")}
            variant="primary"
          >
            <ExternalLink size={17} /> Open Codex
          </Button>
          <Button disabled={busyAction !== null} onClick={() => void runAction("settings")}>
            <Settings size={17} /> Open Codex Settings
          </Button>
          <Button disabled={busyAction !== null} onClick={() => void runAction("newThread")}>
            <MessageSquarePlus size={17} /> New Codex Thread
          </Button>
        </div>
      </article>

      <article className="card">
        <h2>Integration boundary</h2>
        <p>
          Deep links are constructed in one module and opened through Tauri's opener plugin. v0.1
          does not automate windows, keyboard input, browser state, credentials, or network traffic.
        </p>
      </article>
    </section>
  );
}
