import { describe, expect, it } from "vitest";
import { detectAlertEvents } from "../src/modules/alert-events";
import type { SignalDecision } from "../src/domain/signals";

const baseDecision: SignalDecision = {
  instrumentId: "US:XNAS:AAPL",
  finality: "provisional",
  confidence: 0.5,
  rulesContribution: 0.3,
  aiContribution: 0.2,
  aiWeightHaircut: 0,
  qualityFlags: [],
  sourceEvidence: [],
  tradeTimingPlan: {
    actionLabel: "HOLD",
    entryZone: { low: 98, high: 102 },
    stopLevel: 92,
    targetZone: { low: 110, high: 116 },
    timeHorizon: "days_to_weeks",
  },
  rationale: [],
};

describe("Alert Events", () => {
  it("detects signal state changes and target-zone reaches", () => {
    const events = detectAlertEvents({
      previous: baseDecision,
      current: {
        ...baseDecision,
        confidence: 0.8,
        tradeTimingPlan: {
          ...baseDecision.tradeTimingPlan,
          actionLabel: "BUY",
        },
      },
      latestPrice: 112,
      aiContextShift: false,
      portfolioRiskFlag: false,
    });

    expect(events.map((event) => event.type)).toEqual([
      "SIGNAL_STATE_CHANGED",
      "TARGET_ZONE_REACHED",
    ]);
  });
});
