import type { QualityFlag } from "../domain/market";
import type { Portfolio, PortfolioActionLabel } from "../domain/portfolio";
import type { SignalDecision } from "../domain/signals";

export type PortfolioAction = {
  label: PortfolioActionLabel;
  riskFlags: QualityFlag[];
  explanation: string;
};

export function interpretForPortfolio(input: {
  signalDecision: SignalDecision;
  portfolio: Portfolio;
  maxPositionWeight: number;
}): PortfolioAction {
  const totalMarketValue = input.portfolio.holdings.reduce(
    (sum, holding) => sum + holding.marketValue,
    0,
  );
  const holding = input.portfolio.holdings.find(
    (item) => item.instrumentId === input.signalDecision.instrumentId,
  );
  const currentWeight =
    holding && totalMarketValue > 0 ? holding.marketValue / totalMarketValue : 0;
  const isOverweight = currentWeight > input.maxPositionWeight;
  const baseRiskFlags = input.signalDecision.qualityFlags;

  if (input.signalDecision.tradeTimingPlan.actionLabel === "REVIEW_REQUIRED") {
    return {
      label: "REVIEW_REQUIRED",
      riskFlags: isOverweight
        ? appendRiskFlag(baseRiskFlags, "high_portfolio_concentration")
        : baseRiskFlags,
      explanation: isOverweight
        ? "Signal quality requires professional Portfolio review, and the position is overweight."
        : "Signal quality requires professional Portfolio review.",
    };
  }

  if (isOverweight) {
    return {
      label: "TRIM_CANDIDATE",
      riskFlags: appendRiskFlag(baseRiskFlags, "high_portfolio_concentration"),
      explanation:
        "Raw signal is overridden because the Portfolio is already overweight.",
    };
  }

  if (input.signalDecision.tradeTimingPlan.actionLabel === "BUY" && holding) {
    return {
      label: "ADD_ON_CANDIDATE",
      riskFlags: baseRiskFlags,
      explanation: "BUY signal applies to an existing position.",
    };
  }

  if (input.signalDecision.tradeTimingPlan.actionLabel === "BUY") {
    return {
      label: "NEW_BUY_CANDIDATE",
      riskFlags: baseRiskFlags,
      explanation: "BUY signal applies to a new Portfolio candidate.",
    };
  }

  if (input.signalDecision.tradeTimingPlan.actionLabel === "SELL") {
    return {
      label: "EXIT_CANDIDATE",
      riskFlags: baseRiskFlags,
      explanation: "SELL signal indicates an exit review.",
    };
  }

  return {
    label: "HOLD_AND_MONITOR",
    riskFlags: baseRiskFlags,
    explanation: "Signal does not require an immediate Portfolio change.",
  };
}

function appendRiskFlag(flags: QualityFlag[], flag: QualityFlag): QualityFlag[] {
  return flags.includes(flag) ? flags : [...flags, flag];
}
