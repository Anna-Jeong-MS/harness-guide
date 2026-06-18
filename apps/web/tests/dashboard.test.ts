import { describe, expect, it } from "vitest";
import { renderDashboardSummary } from "../src/modules/dashboard-summary";

describe("ProfessionalWorkspace dashboard", () => {
  it("renders ranked opportunities with AI influence and professional context", () => {
    const html = renderDashboardSummary({
      opportunities: [
        {
          instrumentId: "US:XNAS:AAPL",
          actionLabel: "BUY",
          confidence: 0.82,
          aiContribution: 0.4,
          portfolioAction: "NEW_BUY_CANDIDATE",
        },
      ],
    });

    expect(html).toContain("US:XNAS:AAPL");
    expect(html).toContain("BUY");
    expect(html).toContain("AI contribution: 0.4");
    expect(html).toContain("Professional review required");
  });
});
