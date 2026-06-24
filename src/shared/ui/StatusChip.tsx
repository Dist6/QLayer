type StatusTone = "neutral" | "success" | "warning" | "danger";

type StatusChipProps = {
  children: string;
  tone?: StatusTone;
};

export function StatusChip({ children, tone = "neutral" }: StatusChipProps) {
  return <span className={`status-chip status-chip-${tone}`}>{children}</span>;
}
