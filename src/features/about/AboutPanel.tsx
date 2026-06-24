import { Button } from "../../shared/ui/Button";
import { StatusChip } from "../../shared/ui/StatusChip";

type AboutPanelProps = {
  onBack: () => void;
};

export function AboutPanel({ onBack }: AboutPanelProps) {
  return (
    <section className="secondary-view">
      <h1>About</h1>
      <article className="compact-card">
        <h2>QoLayer</h2>
        <dl className="about-list">
          <div>
            <dt>Version</dt>
            <dd>v0.1.0</dd>
          </div>
          <div>
            <dt>License</dt>
            <dd>AGPL-3.0-only</dd>
          </div>
          <div>
            <dt>Project</dt>
            <dd>Unofficial</dd>
          </div>
          <div>
            <dt>Repository</dt>
            <dd>github.com/qolayer/qolayer</dd>
          </div>
        </dl>
      </article>
      <article className="compact-card">
        <h2>Privacy</h2>
        <div className="privacy-pills">
          <StatusChip tone="success">Local-first</StatusChip>
          <StatusChip tone="success">No telemetry</StatusChip>
          <StatusChip tone="success">No credentials</StatusChip>
          <StatusChip tone="success">No proxy</StatusChip>
        </div>
      </article>
      <Button onClick={onBack} variant="ghost">
        Back to Quick Tools
      </Button>
    </section>
  );
}
