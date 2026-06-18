import type { DataFinality, InstrumentId, QualityFlag } from "./market";

export type ActionLabel = "BUY" | "HOLD" | "SELL" | "REVIEW_REQUIRED";

export type TradeTimingPlan = {
  actionLabel: ActionLabel;
  entryZone: {
    low: number;
    high: number;
  };
  stopLevel: number;
  targetZone: {
    low: number;
    high: number;
  };
  timeHorizon: "days_to_weeks";
};

export type SignalDecision = {
  instrumentId: InstrumentId;
  finality: DataFinality;
  confidence: number;
  rulesContribution: number;
  aiContribution: number;
  aiWeightHaircut: number;
  qualityFlags: QualityFlag[];
  tradeTimingPlan: TradeTimingPlan;
  rationale: string[];
};

export function isProvisionalSignal(signal: { finality: DataFinality }): boolean {
  return signal.finality === "provisional";
}

export function isConfirmedSignal(signal: { finality: DataFinality }): boolean {
  return signal.finality === "confirmed";
}
