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
  it("turns a BUY signal into TRIM_CANDIDATE when the holding is overweight", () => {
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
      signalDecision: buyDecision,
      portfolio,
      maxPositionWeight: 0.5,
    });

    expect(action.label).toBe("TRIM_CANDIDATE");
    expect(action.riskFlags).toContain("high_portfolio_concentration");
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
});
