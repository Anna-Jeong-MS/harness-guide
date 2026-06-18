type DashboardOpportunity = {
  instrumentId: string;
  actionLabel: string;
  confidence: number;
  aiContribution: number;
  portfolioAction: string;
};

export function renderDashboardSummary(input: {
  opportunities: DashboardOpportunity[];
}): string {
  return [
    "<section>",
    "<h1>Professional Stock Signal Workspace</h1>",
    "<p>Professional review required before external use.</p>",
    ...input.opportunities.map(
      (item) =>
        `<article><h2>${escapeHtml(item.instrumentId)}</h2><strong>${escapeHtml(
          item.actionLabel,
        )}</strong><p>Confidence: ${item.confidence}</p><p>AI contribution: ${
          item.aiContribution
        }</p><p>Portfolio action: ${escapeHtml(item.portfolioAction)}</p></article>`,
    ),
    "</section>",
  ].join("");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
