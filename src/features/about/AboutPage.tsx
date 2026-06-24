import { PageHeader } from "../../shared/ui/PageHeader";
import { StatusChip } from "../../shared/ui/StatusChip";

export function AboutPage() {
  return (
    <section className="page">
      <PageHeader
        title="About QoLayer"
        description="A local-first desktop companion layer for coding assistant apps."
      />

      <div className="grid-2">
        <article className="card stack">
          <StatusChip>v0.1.0</StatusChip>
          <h2>Mission</h2>
          <p>
            QoLayer adds focused quality-of-life workflows around coding assistant apps while
            keeping local control, privacy, and maintainability central.
          </p>
        </article>

        <article className="card stack">
          <StatusChip>AGPL-3.0-only</StatusChip>
          <h2>Project status</h2>
          <p>
            Unofficial project. QoLayer is not affiliated with, endorsed by, or sponsored by OpenAI,
            Anthropic, or any other coding assistant provider.
          </p>
        </article>
      </div>

      <article className="card">
        <h2>Repository</h2>
        <p>
          Placeholder GitHub repository URL: https://github.com/qolayer/qolayer. Starting with
          Codex. More coding assistant apps may be supported later.
        </p>
      </article>
    </section>
  );
}
