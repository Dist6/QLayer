export function AboutPanel() {
  return (
    <section className="tool-view about-view">
      <div className="view-heading">
        <h1>QLayer</h1>
        <span className="version-label">v0.1.0</span>
      </div>
      <p>Compact shortcuts and utilities for Codex and ChatGPT.</p>
      <dl>
        <div>
          <dt>License</dt>
          <dd>AGPL-3.0-only</dd>
        </div>
        <div>
          <dt>Privacy</dt>
          <dd>Local-first · No telemetry</dd>
        </div>
      </dl>
    </section>
  );
}
