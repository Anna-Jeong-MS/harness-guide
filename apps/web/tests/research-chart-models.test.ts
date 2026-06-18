import { describe, expect, it } from "vitest";
import { buildResearchChartSuite } from "../src/modules/research-chart-models";

describe("research chart models", () => {
  it("builds chart-ready models for a complete signal detail", () => {
    const suite = buildResearchChartSuite("US:XNAS:NVDA");

    expect(suite.priceVolume.state).toBe("available");
    expect(suite.priceVolume.data?.entryZone).toEqual({ low: 118, high: 124 });
    expect(suite.indicators.data?.rsi).toBe(61);
    expect(suite.contribution.data?.segments).toEqual([
      { label: "Rules and factors", value: 0.52 },
      { label: "AI context", value: 0.42 },
      { label: "AI Weight Haircut", value: -0.06 },
    ]);
    expect(suite.risk.data?.metrics.map((metric) => metric.label)).toContain("AI uncertainty");
    expect(suite.backtest.data?.maxDrawdown).toBe(0.18);
    expect(suite.portfolioExposure.data?.weights).toContainEqual({
      label: "Semiconductors",
      value: 0.34,
    });
  });

  it("returns explicit unavailable states when a panel lacks enough data", () => {
    const suite = buildResearchChartSuite("KR:XKRX:000830");

    expect(suite.backtest).toEqual({
      state: "unavailable",
      reason: "Insufficient backtest sample for this instrument.",
    });
  });
});
