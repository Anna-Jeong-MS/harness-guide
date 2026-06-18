export function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function formatPrice(value: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: value >= 1000 ? 0 : 2,
  }).format(value);
}

export function formatPriceRange(range: { low: number; high: number }): string {
  return `${formatPrice(range.low)} - ${formatPrice(range.high)}`;
}

export function formatRisk(value: number): { label: "Low" | "Moderate" | "High"; display: string } {
  const label = value < 0.34 ? "Low" : value < 0.67 ? "Moderate" : "High";
  return {
    label,
    display: `${label} (${formatPercent(value)})`,
  };
}
