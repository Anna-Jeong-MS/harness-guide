import { renderDashboardSummary } from "../src/modules/dashboard-summary";

export default function Page() {
  const html = renderDashboardSummary({
    opportunities: [
      {
        instrumentId: "US:XNAS:AAPL",
        actionLabel: "BUY",
        confidence: 0.82,
        aiContribution: 0.4,
        portfolioAction: "NEW_BUY_CANDIDATE",
      },
      {
        instrumentId: "KR:XKRX:005930",
        actionLabel: "HOLD",
        confidence: 0.61,
        aiContribution: 0.22,
        portfolioAction: "HOLD_AND_MONITOR",
      },
    ],
  });

  return <main dangerouslySetInnerHTML={{ __html: html }} />;
}
