import type { InstrumentId } from "../domain/market";

export type ChartPanel<T> =
  | { state: "available"; data: T; reason?: never }
  | { state: "unavailable"; reason: string; data?: never };

export type ResearchChartSuite = {
  priceVolume: ChartPanel<{
    points: Array<{ date: string; close: number; volume: number }>;
    entryZone: { low: number; high: number };
    stopLevel: number;
    targetZone: { low: number; high: number };
  }>;
  indicators: ChartPanel<{
    rsi: number;
    macd: number;
    movingAverage20: number;
    movingAverage60: number;
    volatility: number;
    volumeSurge: number;
  }>;
  contribution: ChartPanel<{
    finalConfidence: number;
    segments: Array<{ label: string; value: number }>;
  }>;
  risk: ChartPanel<{
    metrics: Array<{ label: string; value: number }>;
  }>;
  backtest: ChartPanel<{
    winRate: number;
    expectedValue: number;
    maxDrawdown: number;
    equityCurve: Array<{ period: string; value: number }>;
  }>;
  portfolioExposure: ChartPanel<{
    weights: Array<{ label: string; value: number }>;
  }>;
};

export function buildResearchChartSuite(instrumentId: InstrumentId): ResearchChartSuite {
  const isIncomplete = instrumentId === "KR:XKRX:000830";
  return {
    priceVolume: {
      state: "available",
      data: {
        points: [
          { date: "2026-06-14", close: 116, volume: 1200000 },
          { date: "2026-06-15", close: 119, volume: 1420000 },
          { date: "2026-06-16", close: 123, volume: 1810000 },
          { date: "2026-06-17", close: 126, volume: 1740000 },
        ],
        entryZone: isIncomplete ? { low: 154000, high: 159000 } : { low: 118, high: 124 },
        stopLevel: isIncomplete ? 148000 : 109,
        targetZone: isIncomplete ? { low: 171000, high: 178000 } : { low: 138, high: 146 },
      },
    },
    indicators: {
      state: "available",
      data: {
        rsi: isIncomplete ? 47 : 61,
        macd: 1.8,
        movingAverage20: 122,
        movingAverage60: 115,
        volatility: isIncomplete ? 0.18 : 0.24,
        volumeSurge: isIncomplete ? 1.08 : 1.42,
      },
    },
    contribution: {
      state: "available",
      data: {
        finalConfidence: isIncomplete ? 0.57 : 0.88,
        segments: [
          { label: "Rules and factors", value: isIncomplete ? 0.39 : 0.52 },
          { label: "AI context", value: isIncomplete ? 0.18 : 0.42 },
          { label: "AI Weight Haircut", value: isIncomplete ? 0 : -0.06 },
        ],
      },
    },
    risk: {
      state: "available",
      data: {
        metrics: [
          { label: "Volatility", value: isIncomplete ? 0.42 : 0.76 },
          { label: "Concentration", value: isIncomplete ? 0.37 : 0.68 },
          { label: "Liquidity", value: 0.22 },
          { label: "Event risk", value: isIncomplete ? 0.33 : 0.61 },
          { label: "Data quality", value: 0.18 },
          { label: "AI uncertainty", value: isIncomplete ? 0.29 : 0.44 },
        ],
      },
    },
    backtest: isIncomplete
      ? {
          state: "unavailable",
          reason: "Insufficient backtest sample for this instrument.",
        }
      : {
          state: "available",
          data: {
            winRate: 0.58,
            expectedValue: 0.14,
            maxDrawdown: 0.18,
            equityCurve: [
              { period: "2022", value: 1 },
              { period: "2023", value: 1.18 },
              { period: "2024", value: 1.32 },
              { period: "2025", value: 1.41 },
            ],
          },
        },
    portfolioExposure: {
      state: "available",
      data: {
        weights: [{ label: isIncomplete ? "Industrials" : "Semiconductors", value: isIncomplete ? 0.12 : 0.34 }],
      },
    },
  };
}
