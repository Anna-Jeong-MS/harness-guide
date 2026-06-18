import { describe, expect, it } from "vitest";
import { interpretForPortfolio } from "../src/modules/portfolio-interpretation";
import type { Portfolio } from "../src/domain/portfolio";
import type { SignalDecision } from "../src/domain/signals";

const buyDecision: SignalDecision = {
  instrumentId: "US:XNAS:AAPL",
  finality: "confirmed",
  confidence: 0.8,
  rulesContribution: 0.4,
  aiContribution: 0.4,
  aiWeightHaircut: 0,
  qualityFlags: [],
  sourceEvidence: [],
  tradeTimingPlan: {
    actionLabel: "BUY",
    entryZone: { low: 98, high: 102 },
    stopLevel: 92,
    targetZone: { low: 110, high: 116 },
    timeHorizon: "days_to_weeks",
  },
  rationale: ["Strong trend"],
};

describe("PortfolioInterpretationModule", () => {
  it("preserves quality flags for BUY signals on existing positions", () => {
    const action = interpretForPortfolio({
      signalDecision: decisionWith({
        actionLabel: "BUY",
        qualityFlags: ["weak_ai_source_evidence"],
      }),
      portfolio: portfolioWithAaplHolding(40_000, 60_000),
      maxPositionWeight: 0.5,
    });

    expect(action.label).toBe("ADD_ON_CANDIDATE");
    expect(action.riskFlags).toEqual(["weak_ai_source_evidence"]);
  });

  it("preserves quality flags for BUY signals on new positions", () => {
    const action = interpretForPortfolio({
      signalDecision: decisionWith({
        actionLabel: "BUY",
        qualityFlags: ["weak_ai_source_evidence"],
      }),
      portfolio: portfolioWithAaplHolding(0, 100_000),
      maxPositionWeight: 0.5,
    });

    expect(action.label).toBe("NEW_BUY_CANDIDATE");
    expect(action.riskFlags).toEqual(["weak_ai_source_evidence"]);
  });

  it("preserves quality flags for SELL signals", () => {
    const action = interpretForPortfolio({
      signalDecision: decisionWith({
        actionLabel: "SELL",
        qualityFlags: ["weak_ai_source_evidence"],
      }),
      portfolio: portfolioWithAaplHolding(40_000, 60_000),
      maxPositionWeight: 0.5,
    });

    expect(action.label).toBe("EXIT_CANDIDATE");
    expect(action.riskFlags).toEqual(["weak_ai_source_evidence"]);
  });

  it("preserves quality flags for HOLD signals", () => {
    const action = interpretForPortfolio({
      signalDecision: decisionWith({
        actionLabel: "HOLD",
        qualityFlags: ["weak_ai_source_evidence"],
      }),
      portfolio: portfolioWithAaplHolding(40_000, 60_000),
      maxPositionWeight: 0.5,
    });

    expect(action.label).toBe("HOLD_AND_MONITOR");
    expect(action.riskFlags).toEqual(["weak_ai_source_evidence"]);
  });

  it("preserves quality flags and appends concentration once when overweight", () => {
    const action = interpretForPortfolio({
      signalDecision: decisionWith({
        actionLabel: "BUY",
        qualityFlags: ["weak_ai_source_evidence"],
      }),
      portfolio: portfolioWithAaplHolding(60_000, 40_000),
      maxPositionWeight: 0.5,
    });

    expect(action.label).toBe("TRIM_CANDIDATE");
    expect(action.riskFlags).toEqual([
      "weak_ai_source_evidence",
      "high_portfolio_concentration",
    ]);
  });

  it("does not duplicate concentration flags when already present", () => {
    const action = interpretForPortfolio({
      signalDecision: decisionWith({
        actionLabel: "BUY",
        qualityFlags: ["high_portfolio_concentration"],
      }),
      portfolio: portfolioWithAaplHolding(60_000, 40_000),
      maxPositionWeight: 0.5,
    });

    expect(action.label).toBe("TRIM_CANDIDATE");
    expect(action.riskFlags).toEqual(["high_portfolio_concentration"]);
  });

  it("preserves REVIEW_REQUIRED signals as review-required Portfolio actions", () => {
    const reviewRequiredDecision: SignalDecision = {
      ...buyDecision,
      qualityFlags: ["weak_ai_source_evidence"],
      tradeTimingPlan: {
        ...buyDecision.tradeTimingPlan,
        actionLabel: "REVIEW_REQUIRED",
      },
    };
    const portfolio: Portfolio = {
      id: "portfolio-1",
      workspaceId: "workspace-1",
      type: "personal",
      name: "Main",
      holdings: [],
    };

    const action = interpretForPortfolio({
      signalDecision: reviewRequiredDecision,
      portfolio,
      maxPositionWeight: 0.5,
    });

    expect(action.label).toBe("REVIEW_REQUIRED");
    expect(action.riskFlags).toContain("weak_ai_source_evidence");
  });

  it("preserves overweight REVIEW_REQUIRED signals with concentration and quality risk flags", () => {
    const reviewRequiredDecision: SignalDecision = {
      ...buyDecision,
      qualityFlags: ["weak_ai_source_evidence", "conflicting_news_or_disclosures"],
      tradeTimingPlan: {
        ...buyDecision.tradeTimingPlan,
        actionLabel: "REVIEW_REQUIRED",
      },
    };
    const portfolio: Portfolio = {
      id: "portfolio-1",
      workspaceId: "workspace-1",
      type: "personal",
      name: "Main",
      holdings: [
        {
          instrumentId: "US:XNAS:AAPL",
          quantity: 100,
          averageEntryPrice: 80,
          marketValue: 60_000,
        },
        {
          instrumentId: "US:XNAS:MSFT",
          quantity: 100,
          averageEntryPrice: 200,
          marketValue: 40_000,
        },
      ],
    };

    const action = interpretForPortfolio({
      signalDecision: reviewRequiredDecision,
      portfolio,
      maxPositionWeight: 0.5,
    });

    expect(action.label).toBe("REVIEW_REQUIRED");
    expect(action.riskFlags).toContain("high_portfolio_concentration");
    expect(action.riskFlags).toContain("weak_ai_source_evidence");
    expect(action.riskFlags).toContain("conflicting_news_or_disclosures");
  });
});

function decisionWith({
  actionLabel,
  qualityFlags,
}: {
  actionLabel: SignalDecision["tradeTimingPlan"]["actionLabel"];
  qualityFlags: SignalDecision["qualityFlags"];
}): SignalDecision {
  return {
    ...buyDecision,
    qualityFlags,
    tradeTimingPlan: {
      ...buyDecision.tradeTimingPlan,
      actionLabel,
    },
  };
}

function portfolioWithAaplHolding(
  aaplMarketValue: number,
  msftMarketValue: number,
): Portfolio {
  return {
    id: "portfolio-1",
    workspaceId: "workspace-1",
    type: "personal",
    name: "Main",
    holdings: [
      ...(aaplMarketValue > 0
        ? [
            {
              instrumentId: "US:XNAS:AAPL" as const,
              quantity: 100,
              averageEntryPrice: 80,
              marketValue: aaplMarketValue,
            },
          ]
        : []),
      {
        instrumentId: "US:XNAS:MSFT",
        quantity: 100,
        averageEntryPrice: 200,
        marketValue: msftMarketValue,
      },
    ],
  };
}
