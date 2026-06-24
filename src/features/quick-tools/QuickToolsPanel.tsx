import { ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";

import { StatusChip } from "../../shared/ui/StatusChip";
import type { TrayStatus } from "../tray/trayEvents";
import type { VoiceFlowState } from "../voice-flow/useVoiceFlow";
import { quickTools, type QuickTool, type QuickToolStatus } from "./quickTools";

type QuickToolsPanelProps = {
  codexMessage: string;
  trayStatus: TrayStatus;
  voiceFlow: VoiceFlowState;
};

export function QuickToolsPanel({ codexMessage, trayStatus, voiceFlow }: QuickToolsPanelProps) {
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (codexMessage !== "Ready.") {
      setNotice(codexMessage);
    }
  }, [codexMessage]);

  useEffect(() => {
    if (voiceFlow.status.message !== "Ready.") {
      setNotice(voiceFlow.status.message);
    }
  }, [voiceFlow.status]);

  const runTool = (tool: QuickTool) => {
    if (tool.id === "startVoiceFlow") {
      void voiceFlow.start();
      return;
    }

    if (tool.id === "restoreAudio") {
      void voiceFlow.restore();
      return;
    }

    if (tool.id === "trayControls") {
      setNotice(trayStatus.message);
      return;
    }

    setNotice(`${tool.title} is planned.`);
  };

  return (
    <section className="quick-tools-view">
      <h1>Quick Tools</h1>
      <div className="tool-list">
        {quickTools.map((tool) => (
          <ToolCard key={tool.id} onRun={runTool} tool={tool} />
        ))}
      </div>
      {notice ? <p className="inline-status">{notice}</p> : null}
    </section>
  );
}

type ToolCardProps = {
  tool: QuickTool;
  onRun: (tool: QuickTool) => void;
};

function ToolCard({ tool, onRun }: ToolCardProps) {
  const Icon = tool.icon;

  return (
    <button className="tool-card" onClick={() => onRun(tool)} type="button">
      <span className="tool-icon">
        <Icon size={24} aria-hidden="true" />
      </span>
      <span className="tool-title">{tool.title}</span>
      <ToolStatus status={tool.status} />
      <ChevronRight className="tool-chevron" size={20} aria-hidden="true" />
    </button>
  );
}

function ToolStatus({ status }: { status: QuickToolStatus }) {
  if (status === "ready") {
    return <StatusChip tone="warning">Ready</StatusChip>;
  }

  if (status === "active") {
    return <StatusChip tone="warning">Active</StatusChip>;
  }

  return <StatusChip>Planned</StatusChip>;
}
