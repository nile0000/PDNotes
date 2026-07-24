export const severityLabels: Record<number, string> = {
  1: "Great",
  2: "Good",
  3: "Fine",
  4: "Bad",
  5: "Terrible",
};

const severityColors: Record<number, string> = {
  1: "#34C759",
  2: "#8BC34A",
  3: "#FFC107",
  4: "#FF9800",
  5: "#F44336",
};

export function severityDisplay(severity: number): string {
  return severityLabels[severity] ?? "Unrated";
}

export function severityColor(severity: number): string {
  return severityColors[severity] ?? "#C7C7CC";
}
