export type ValidationTone = "success" | "warning" | "danger" | "info";

export function formatRelativeProjectState(
  doneCount: number,
  totalCount: number,
) {
  if (totalCount === 0) {
    return { label: "No nodes yet", tone: "warning" as ValidationTone };
  }

  if (doneCount === totalCount) {
    return { label: "All nodes complete", tone: "success" as ValidationTone };
  }

  if (doneCount === 0) {
    return { label: "Start documenting", tone: "warning" as ValidationTone };
  }

  return { label: "In progress", tone: "info" as ValidationTone };
}

export function getValidationTone(
  errorCount: number,
  warningCount: number,
): ValidationTone {
  if (errorCount > 0) return "danger";
  if (warningCount > 0) return "warning";
  return "success";
}

export function getMetricPillClass(tone: ValidationTone) {
  switch (tone) {
    case "danger":
      return "metric-pill metric-pill--danger";
    case "warning":
      return "metric-pill metric-pill--warning";
    case "info":
      return "metric-pill metric-pill--info";
    default:
      return "metric-pill metric-pill--success";
  }
}
