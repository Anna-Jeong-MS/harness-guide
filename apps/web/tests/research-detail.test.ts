import { describe, expect, it } from "vitest";
import { buildResearchDetail, renderResearchDetailPage } from "../src/modules/research-detail";

describe("Research Detail", () => {
  it("renders fixed summary and tabbed Research Report Panels", () => {
    const html = renderResearchDetailPage(buildResearchDetail("US:XNAS:NVDA"));

    expect(html).toContain("Signal Brief");
    expect(html).toContain("Trade Timing");
    expect(html).toContain("command-bar");
    expect(html).toContain("fixed-summary");
    expect(html).toContain("Report tabs");
    expect(html).toContain("segmented-tabs");
    expect(html).toContain("Evidence Panel");
    expect(html).toContain("Technical Report Panel");
    expect(html).toContain("AI Context Report Panel");
    expect(html).toContain("Portfolio Impact Report Panel");
    expect(html).toContain("Backtest Report Panel");
    expect(html).toContain("Risk Report Panel");
    expect(html).toContain("Audit Panel");
    expect(html).toContain("Research and Report Actions Panel");
  });

  it("pairs strong Action Labels with decision-support copy and risk evidence", () => {
    const html = renderResearchDetailPage(buildResearchDetail("US:XNAS:NVDA"));
    const signalBrief = sectionBetween(html, "<h2>Signal Brief</h2>", "<h2>Trade Timing</h2>");

    expect(html).toContain("BUY");
    expect(html).toContain("action-badge action-buy");
    expect(html).toContain("Confidence 88%");
    expect(html).toContain("Entry Zone: 118 - 124");
    expect(html).toContain("Decision-support only");
    expect(html).toContain("Review Required conditions");
    expect(signalBrief).toContain("High volatility requires disciplined entry and stop monitoring.");
  });

  it("formats AI contribution and haircut as percentages in the AI Context Report Panel", () => {
    const html = renderResearchDetailPage(buildResearchDetail("US:XNAS:NVDA"));
    const aiContextPanel = sectionBetween(html, "AI Context Report Panel", "Portfolio Impact Report Panel");

    expect(aiContextPanel).toContain("AI contribution: 42%");
    expect(aiContextPanel).toContain("AI Weight Haircut: 6%");
    expect(aiContextPanel).not.toContain("0.42");
    expect(aiContextPanel).not.toContain("0.06");
  });

  it("renders the primary chart after Trade Timing and before report tabs", () => {
    const html = renderResearchDetailPage(buildResearchDetail("US:XNAS:NVDA"));
    const tradeTimingIndex = html.indexOf("<h2>Trade Timing</h2>");
    const primaryChartIndex = html.indexOf('class="primary-chart-panel"');
    const reportTabsIndex = html.indexOf('class="report-tabs"');

    expect(primaryChartIndex).toBeGreaterThan(tradeTimingIndex);
    expect(primaryChartIndex).toBeLessThan(reportTabsIndex);
    expect(sectionBetween(html, 'class="primary-chart-panel"', 'class="report-tabs"')).toContain("Price and Volume");
    expect(sectionBetween(html, 'class="primary-chart-panel"', 'class="report-tabs"')).toContain("chart-scroll");
  });

  it("marks Portfolio Impact unavailable without making portfolio claims", () => {
    const html = renderResearchDetailPage(buildResearchDetail("US:XNAS:NVDA", { portfolioAvailable: false }));

    expect(html).toContain("Portfolio Impact Report Panel");
    expect(html).toContain("Portfolio unavailable; portfolio-specific claims are not shown.");
  });

  it("shows insufficient backtest sample as review-required", () => {
    const detail = buildResearchDetail("KR:XKRX:000830");
    const html = renderResearchDetailPage(detail);

    expect(detail.actionLabel).toBe("REVIEW_REQUIRED");
    expect(detail.tradeTimingPlan.actionLabel).toBe("REVIEW_REQUIRED");
    expect(html).toContain("Insufficient backtest sample for this instrument.");
    expect(html).toContain("Review required before interpreting performance support.");
  });

  it("marks portfolio exposure chart unavailable when Portfolio is unavailable", () => {
    const detail = buildResearchDetail("US:XNAS:NVDA", { portfolioAvailable: false });

    expect(detail.charts.portfolioExposure).toEqual({
      state: "unavailable",
      reason: "Portfolio unavailable; portfolio-specific claims are not shown.",
    });
  });

  function sectionBetween(html: string, start: string, end: string): string {
    const startIndex = html.indexOf(start);
    const endIndex = html.indexOf(end, startIndex + start.length);

    expect(startIndex).toBeGreaterThanOrEqual(0);
    expect(endIndex).toBeGreaterThan(startIndex);

    return html.slice(startIndex, endIndex);
  }

  it("does not default unsupported instruments to NVIDIA BUY research", () => {
    const detail = buildResearchDetail("KR:XKRX:005930");
    const html = renderResearchDetailPage(detail);

    expect(html).toContain("Unsupported instrument");
    expect(html).toContain("REVIEW_REQUIRED");
    expect(html).not.toContain("NVIDIA Research Detail");
    expect(html).not.toContain("action-badge action-buy");
    expect(Object.values(detail.charts).every((panel) => panel.state === "unavailable")).toBe(true);
  });
});
