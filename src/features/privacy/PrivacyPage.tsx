import { PageHeader } from "../../shared/ui/PageHeader";
import { StatusChip } from "../../shared/ui/StatusChip";

const commitments = [
  "QoLayer is local-first.",
  "QoLayer does not collect telemetry.",
  "QoLayer does not record audio.",
  "QoLayer does not upload prompts.",
  "QoLayer does not collect credentials or tokens.",
  "QoLayer does not read Codex auth files.",
  "QoLayer does not read browser cookies.",
  "QoLayer does not proxy traffic.",
  "QoLayer stores only local preferences for v0.1.",
  "Future add-ons that require extra permissions must be explicit and opt-in.",
];

export function PrivacyPage() {
  return (
    <section className="page">
      <PageHeader
        title="Privacy"
        description="QoLayer is designed as a local-first utility layer with a narrow permission model."
      />

      <article className="card stack">
        <StatusChip tone="success">No telemetry</StatusChip>
        <ul className="timeline">
          {commitments.map((item) => (
            <li key={item}>
              <span className="timeline-dot" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </article>
    </section>
  );
}
