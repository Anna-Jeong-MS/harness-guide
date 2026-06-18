import type { SignalDecision } from "../domain/signals";

export type AlertEventType =
  | "SIGNAL_STATE_CHANGED"
  | "ENTRY_ZONE_TOUCHED"
  | "STOP_LEVEL_BROKEN"
  | "TARGET_ZONE_REACHED"
  | "AI_CONTEXT_SHIFTED"
  | "PORTFOLIO_RISK_FLAGGED";

export type AlertEvent = {
  type: AlertEventType;
  instrumentId: string;
  message: string;
};

export function detectAlertEvents(input: {
  previous: SignalDecision;
  current: SignalDecision;
  latestPrice: number;
  aiContextShift: boolean;
  portfolioRiskFlag: boolean;
}): AlertEvent[] {
  const events: AlertEvent[] = [];
  const instrumentId = input.current.instrumentId;

  if (input.previous.tradeTimingPlan.actionLabel !== input.current.tradeTimingPlan.actionLabel) {
    events.push({
      type: "SIGNAL_STATE_CHANGED",
      instrumentId,
      message: `Action Label changed to ${input.current.tradeTimingPlan.actionLabel}`,
    });
  }

  if (
    input.latestPrice >= input.current.tradeTimingPlan.entryZone.low &&
    input.latestPrice <= input.current.tradeTimingPlan.entryZone.high
  ) {
    events.push({
      type: "ENTRY_ZONE_TOUCHED",
      instrumentId,
      message: "Latest price entered the entry zone.",
    });
  }

  if (input.latestPrice <= input.current.tradeTimingPlan.stopLevel) {
    events.push({
      type: "STOP_LEVEL_BROKEN",
      instrumentId,
      message: "Latest price crossed below the stop level.",
    });
  }

  if (
    input.latestPrice >= input.current.tradeTimingPlan.targetZone.low &&
    input.latestPrice <= input.current.tradeTimingPlan.targetZone.high
  ) {
    events.push({
      type: "TARGET_ZONE_REACHED",
      instrumentId,
      message: "Latest price entered the target zone.",
    });
  }

  if (input.aiContextShift) {
    events.push({
      type: "AI_CONTEXT_SHIFTED",
      instrumentId,
      message: "AI context shifted materially.",
    });
  }

  if (input.portfolioRiskFlag) {
    events.push({
      type: "PORTFOLIO_RISK_FLAGGED",
      instrumentId,
      message: "Portfolio risk flag is active.",
    });
  }

  return events;
}
