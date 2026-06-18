import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { buildResearchChartSuite } from "../src/modules/research-chart-models";
import { renderResearchCharts } from "../src/modules/research-charts";

describe("research Recharts components", () => {
  it("renders professional chart panel labels from chart-ready models", () => {
    const html = renderToStaticMarkup(renderResearchCharts(buildResearchChartSuite("US:XNAS:NVDA")));

    expect(html).toContain("Price and Volume");
    expect(html).toContain("Technical Indicators");
    expect(html).toContain("Signal Contribution");
    expect(html).toContain("Risk Profile");
    expect(html).toContain("Strategy Backtest");
    expect(html).toContain("Portfolio Exposure");
  });

  it("renders unavailable chart states visibly", () => {
    const html = renderToStaticMarkup(renderResearchCharts(buildResearchChartSuite("KR:XKRX:000830")));

    expect(html).toContain("Insufficient backtest sample for this instrument.");
  });
});
