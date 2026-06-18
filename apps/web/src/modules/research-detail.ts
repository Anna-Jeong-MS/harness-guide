import type { InstrumentId, QualityFlag } from "../domain/market";
import type { ActionLabel, EvidenceSource, TradeTimingPlan } from "../domain/signals";
import { formatPercent, formatPrice, formatPriceRange } from "./formatters";
import { buildResearchChartSuite, type ChartPanel, type ResearchChartSuite } from "./research-chart-models";

export type ResearchDetailViewModel = {
  instrumentId: InstrumentId;
  displayName: string;
  actionLabel: ActionLabel;
  confidence: number;
  finality: "provisional" | "confirmed";
  tradeTimingPlan: TradeTimingPlan;
  aiContribution: number;
  aiWeightHaircut: number;
  rationale: string[];
  conflictingEvidence: string[];
  evidence: EvidenceSource[];
  qualityFlags: QualityFlag[];
  portfolioAvailable: boolean;
  portfolioImpact: string;
  backtestLimitation?: string;
  auditEvents: string[];
  charts: ResearchChartSuite;
};

export function buildResearchDetail(
  instrumentId: InstrumentId,
  options: { portfolioAvailable?: boolean } = {},
): ResearchDetailViewModel {
  const portfolioAvailable = options.portfolioAvailable !== false;
  const isLimitedBacktest = instrumentId === "KR:XKRX:000830";
  const isSupported = instrumentId === "US:XNAS:NVDA" || instrumentId === "US:XNAS:AAPL" || isLimitedBacktest;

  if (!isSupported) {
    return {
      instrumentId,
      displayName: "Unsupported instrument",
      actionLabel: "REVIEW_REQUIRED",
      confidence: 0,
      finality: "confirmed",
      tradeTimingPlan: timing("REVIEW_REQUIRED", 0, 0, 0, 0, 0),
      aiContribution: 0,
      aiWeightHaircut: 0,
      rationale: ["Unsupported instrument. Detail research data is not available for this instrument."],
      conflictingEvidence: ["Review Required conditions apply before interpreting this signal."],
      evidence: [],
      qualityFlags: ["missing_price_data", "missing_event_data"],
      portfolioAvailable,
      portfolioImpact: portfolioAvailable
        ? "Portfolio impact unavailable for unsupported detail research."
        : "Portfolio unavailable; portfolio-specific claims are not shown.",
      backtestLimitation: "Insufficient backtest sample for this instrument.",
      auditEvents: ["Unsupported detail request recorded for professional review."],
      charts: unavailableChartSuite("Unsupported instrument. Detail chart data is not available."),
    };
  }

  return {
    instrumentId,
    displayName: instrumentId === "KR:XKRX:000830" ? "Samsung C&T" : instrumentId === "US:XNAS:AAPL" ? "Apple" : "NVIDIA",
    actionLabel: isLimitedBacktest ? "REVIEW_REQUIRED" : "BUY",
    confidence: isLimitedBacktest ? 0.57 : 0.88,
    finality: "confirmed",
    tradeTimingPlan: isLimitedBacktest
      ? timing("REVIEW_REQUIRED", 154000, 159000, 148000, 171000, 178000)
      : timing("BUY", 118, 124, 109, 138, 146),
    aiContribution: isLimitedBacktest ? 0.18 : 0.42,
    aiWeightHaircut: isLimitedBacktest ? 0 : 0.06,
    rationale: isLimitedBacktest
      ? ["Dividend stability supports monitoring, but backtest evidence is limited."]
      : ["Trend, volume confirmation, and AI infrastructure catalyst evidence align with the Strategy Profile."],
    conflictingEvidence: isLimitedBacktest
      ? ["Insufficient backtest sample for this instrument."]
      : ["High volatility requires disciplined entry and stop monitoring."],
    evidence: [
      {
        sourceType: "news",
        title: "AI infrastructure demand update",
        url: "https://example.com/ai-demand",
        observedAt: "2026-06-18T00:00:00.000Z",
        finality: "confirmed",
      },
    ],
    qualityFlags: isLimitedBacktest ? ["insufficient_backtest_sample"] : ["high_volatility"],
    portfolioAvailable,
    portfolioImpact: portfolioAvailable
      ? "Add-on candidate, but position size should respect semiconductor concentration."
      : "Portfolio unavailable; portfolio-specific claims are not shown.",
    ...(isLimitedBacktest ? { backtestLimitation: "Insufficient backtest sample for this instrument." } : {}),
    auditEvents: [
      "Confirmed Signal recalculated from end-of-day data.",
      "Strategy Profile version swing-momentum-v1 applied.",
      "AI Weight Haircut recorded for source uncertainty.",
    ],
    charts: chartsFor(instrumentId, portfolioAvailable),
  };
}

function chartsFor(instrumentId: InstrumentId, portfolioAvailable: boolean): ResearchChartSuite {
  const charts = buildResearchChartSuite(instrumentId);
  if (portfolioAvailable) {
    return charts;
  }

  return {
    ...charts,
    portfolioExposure: {
      state: "unavailable",
      reason: "Portfolio unavailable; portfolio-specific claims are not shown.",
    },
  };
}

function unavailableChartSuite(reason: string): ResearchChartSuite {
  return {
    priceVolume: { state: "unavailable", reason },
    indicators: { state: "unavailable", reason },
    contribution: { state: "unavailable", reason },
    risk: { state: "unavailable", reason },
    backtest: { state: "unavailable", reason },
    portfolioExposure: { state: "unavailable", reason },
  };
}

export function renderResearchDetailPage(detail: ResearchDetailViewModel): string {
  return [
    '<article class="research-detail">',
    `<header class="terminal-header"><p>${escapeHtml(detail.instrumentId)}</p><h1>${escapeHtml(detail.displayName)} Research Detail</h1></header>`,
    fixedSummary(detail),
    primaryChartPanel(detail.charts.priceVolume),
    '<section class="report-tabs" aria-label="Report tabs"><h2>Report tabs</h2><nav class="segmented-tabs" aria-label="Research Report Panels"><span class="tab-chip">Evidence</span><span class="tab-chip">Technical</span><span class="tab-chip">AI Context</span><span class="tab-chip">Portfolio</span><span class="tab-chip">Backtest</span><span class="tab-chip">Risk</span><span class="tab-chip">Audit</span></nav>',
    panel("Evidence Panel", [
      ...detail.evidence.map((source) => `${source.sourceType}: ${source.title}`),
      ...detail.conflictingEvidence,
    ]),
    panel("Technical Report Panel", ["Recharts technical indicators are rendered from chart-ready models."]),
    panel("AI Context Report Panel", [
      `AI contribution: ${formatPercent(detail.aiContribution)}`,
      `AI Weight Haircut: ${formatPercent(detail.aiWeightHaircut)}`,
    ]),
    panel("Portfolio Impact Report Panel", [detail.portfolioImpact]),
    panel(
      "Backtest Report Panel",
      detail.backtestLimitation
        ? [detail.backtestLimitation, "Review required before interpreting performance support."]
        : ["Win rate, expected value, maximum drawdown, and equity curve available."],
    ),
    panel("Risk Report Panel", [`Quality flags: ${detail.qualityFlags.join(", ")}`, ...detail.conflictingEvidence]),
    panel("Audit Panel", detail.auditEvents),
    panel("Research and Report Actions Panel", [
      "Generate or update an editable Research Note from this evidence.",
      "Draft a Client Report only after Research Note approval and Portfolio context review.",
    ]),
    "</section>",
    "</article>",
  ].join("");
}

function fixedSummary(detail: ResearchDetailViewModel): string {
  const actionClass =
    detail.actionLabel === "BUY"
      ? "action-buy"
      : detail.actionLabel === "HOLD"
        ? "action-hold"
        : detail.actionLabel === "SELL"
          ? "action-sell"
          : "action-review";

  return [
    '<section class="fixed-summary">',
    '<div class="command-bar">',
    `<span>${escapeHtml(detail.instrumentId)}</span>`,
    `<span class="action-badge ${actionClass}">${escapeHtml(detail.actionLabel)}</span>`,
    `<span>Confidence ${formatPercent(detail.confidence)}</span>`,
    `<span>${escapeHtml(detail.finality)}</span>`,
    "<span>Review Required conditions visible</span>",
    "</div>",
    "<h2>Signal Brief</h2>",
    `<p><strong>${escapeHtml(detail.actionLabel)}</strong> · Confidence ${formatPercent(detail.confidence)} · ${detail.finality}</p>`,
    "<p>Decision-support only. Review Required conditions and conflicting evidence must be checked before external use.</p>",
    `<p>${detail.rationale.map(escapeHtml).join(" ")}</p>`,
    `<p>Risk evidence: ${detail.conflictingEvidence.map(escapeHtml).join(" ")}</p>`,
    "<h2>Trade Timing</h2>",
    `<p>Entry Zone: ${formatPriceRange(detail.tradeTimingPlan.entryZone)}</p>`,
    `<p>Stop Level: ${formatPrice(detail.tradeTimingPlan.stopLevel)}</p>`,
    `<p>Target Zone: ${formatPriceRange(detail.tradeTimingPlan.targetZone)}</p>`,
    "</section>",
  ].join("");
}

function primaryChartPanel(
  panel: ChartPanel<{
    points: Array<{ date: string; close: number; volume: number }>;
    entryZone: { low: number; high: number };
    stopLevel: number;
    targetZone: { low: number; high: number };
  }>,
): string {
  if (panel.state === "unavailable") {
    return [
      '<section class="primary-chart-panel" aria-label="Primary chart">',
      "<h2>Price and Volume</h2>",
      `<p>${escapeHtml(panel.reason)}</p>`,
      "</section>",
    ].join("");
  }

  const latestPoint = panel.data.points.at(-1);
  const latestClose = latestPoint ? formatPrice(latestPoint.close) : "Unavailable";

  return [
    '<section class="primary-chart-panel" aria-label="Primary chart">',
    "<h2>Price and Volume</h2>",
    '<div class="chart-scroll">',
    `<p>Latest close: ${escapeHtml(latestClose)}</p>`,
    `<p>Entry Zone: ${formatPriceRange(panel.data.entryZone)}</p>`,
    `<p>Stop Level: ${formatPrice(panel.data.stopLevel)}</p>`,
    `<p>Target Zone: ${formatPriceRange(panel.data.targetZone)}</p>`,
    "</div>",
    "</section>",
  ].join("");
}

function panel(title: string, rows: string[]): string {
  return [`<section class="report-panel"><h3>${escapeHtml(title)}</h3>`, ...rows.map((row) => `<p>${escapeHtml(row)}</p>`), "</section>"].join("");
}

function timing(
  actionLabel: ActionLabel,
  entryLow: number,
  entryHigh: number,
  stopLevel: number,
  targetLow: number,
  targetHigh: number,
): TradeTimingPlan {
  return {
    actionLabel,
    entryZone: { low: entryLow, high: entryHigh },
    stopLevel,
    targetZone: { low: targetLow, high: targetHigh },
    timeHorizon: "days_to_weeks",
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
