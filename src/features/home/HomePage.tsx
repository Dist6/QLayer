import { PageHeader } from "../../shared/ui/PageHeader";
import { StatusChip } from "../../shared/ui/StatusChip";

export function HomePage() {
  return (
    <section className="page">
      <PageHeader
        title="QoLayer"
        description="Quality-of-life tools for coding assistant apps. QoLayer is a local-first desktop companion layer, starting with Codex."
      />

      <div className="grid-2">
        <article className="card stack">
          <StatusChip tone="success">Current integration: Codex</StatusChip>
          <h2>v0.1 focus</h2>
          <p>
            This first release builds a professional foundation and one focused workflow: reducing
            friction around speaking to Codex.
          </p>
        </article>

        <article className="card stack">
          <StatusChip>Future integrations</StatusChip>
          <h2>Companion layer, not an agent</h2>
          <p>
            QoLayer does not connect to AI models. Future support may include Claude Code and other
            coding assistant apps after the Codex foundation is stable.
          </p>
        </article>
      </div>

      <article className="card">
        <h2>What this version intentionally avoids</h2>
        <p>
          No telemetry, no cloud sync, no credential access, no token access, no proxy behavior, no
          usage dashboard, and no add-on marketplace. Native Windows features are planned for a
          later pass after the foundation is validated.
        </p>
      </article>
    </section>
  );
}
