import { ChevronRight } from "lucide-react";

import { StatusChip } from "../../shared/ui/StatusChip";
import type { GlobalHotkeyStatus } from "../global-hotkeys/globalHotkeyEvents";
import {
  getQuickToolStatus,
  quickTools,
  type QuickTool,
  type QuickToolId,
  type QuickToolStatus,
} from "./quickTools";

type QuickToolsPanelProps = {
  globalHotkeyStatus: GlobalHotkeyStatus;
  onOpenTool: (toolId: QuickToolId) => void;
};

export function QuickToolsPanel({ globalHotkeyStatus, onOpenTool }: QuickToolsPanelProps) {
  return (
    <section className="quick-tools-view">
      <h1>Quick Tools</h1>
      <div className="tool-list">
        {quickTools.map((tool) => (
          <ToolCard
            key={tool.id}
            onOpen={onOpenTool}
            status={getQuickToolStatus(tool.id, globalHotkeyStatus)}
            tool={tool}
          />
        ))}
      </div>
    </section>
  );
}

type ToolCardProps = {
  tool: QuickTool;
  status: QuickToolStatus;
  onOpen: (toolId: QuickToolId) => void;
};

function ToolCard({ tool, status, onOpen }: ToolCardProps) {
  const Icon = tool.icon;

  return (
    <button className="tool-card" onClick={() => onOpen(tool.id)} type="button">
      <span className="tool-icon">
        <Icon size={24} aria-hidden="true" />
      </span>
      <span className="tool-copy">
        <span className="tool-title">{tool.title}</span>
        <span className="tool-description">{tool.description}</span>
      </span>
      <ToolStatus status={status} />
      <ChevronRight className="tool-chevron" size={20} aria-hidden="true" />
    </button>
  );
}

function ToolStatus({ status }: { status: QuickToolStatus }) {
  if (status === "ready") {
    return <StatusChip tone="warning">Ready</StatusChip>;
  }

  if (status === "active") {
    return <StatusChip tone="success">Active</StatusChip>;
  }

  if (status === "failed") {
    return <StatusChip tone="danger">Failed</StatusChip>;
  }

  if (status === "notAvailable") {
    return <StatusChip>Not available</StatusChip>;
  }

  return <StatusChip>Planned</StatusChip>;
}
