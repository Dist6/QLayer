import { ArrowLeft } from "lucide-react";

import { StatusChip } from "../../shared/ui/StatusChip";
import {
  getGlobalHotkeyStatusLabel,
  type GlobalHotkeyStatus,
  type GlobalHotkeyStatusState,
} from "./globalHotkeyEvents";

type GlobalHotkeysDetailPanelProps = {
  status: GlobalHotkeyStatus;
  onBack: () => void;
};

export function GlobalHotkeysDetailPanel({ status, onBack }: GlobalHotkeysDetailPanelProps) {
  return (
    <section className="secondary-view">
      <button className="back-button" onClick={onBack} type="button">
        <ArrowLeft size={16} aria-hidden="true" /> Quick Tools
      </button>

      <div className="detail-heading">
        <h1>Global Hotkeys</h1>
        <GlobalHotkeyStatusChip state={status.state} />
      </div>

      <article className="compact-card settings-grid">
        <dl className="detail-list">
          <div>
            <dt>Current shortcut</dt>
            <dd>{status.shortcut}</dd>
          </div>
          <div>
            <dt>Action target</dt>
            <dd>Start Voice Flow</dd>
          </div>
          <div>
            <dt>Registration status</dt>
            <dd>{getGlobalHotkeyStatusLabel(status.state)}</dd>
          </div>
        </dl>
        {status.message ? <p>{status.message}</p> : null}
      </article>
    </section>
  );
}

function GlobalHotkeyStatusChip({ state }: { state: GlobalHotkeyStatusState }) {
  if (state === "active") {
    return <StatusChip tone="success">Active</StatusChip>;
  }

  if (state === "failed") {
    return <StatusChip tone="danger">Failed</StatusChip>;
  }

  return <StatusChip>Not available</StatusChip>;
}
