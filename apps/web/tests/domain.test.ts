import { describe, expect, it } from "vitest";
import {
  parseInstrumentId,
  type InstrumentId,
  toInstrumentId,
} from "../src/domain/market";
import { defaultSwingMomentumProfile } from "../src/domain/strategy";
import {
  isConfirmedSignal,
  isProvisionalSignal,
  type SignalDecision,
} from "../src/domain/signals";

describe("domain language", () => {
  it("round-trips canonical InstrumentId values", () => {
    const instrumentId = toInstrumentId({
      market: "KR",
      exchange: "XKRX",
      symbol: "005930",
    });

    expect(instrumentId).toBe("KR:XKRX:005930");
    expect(parseInstrumentId(instrumentId)).toEqual({
      market: "KR",
      exchange: "XKRX",
      symbol: "005930",
    });
  });

  it("rejects InstrumentId values with extra colon segments", () => {
    expect(() =>
      parseInstrumentId("KR:XKRX:005930:EXTRA" as InstrumentId),
    ).toThrow("Invalid InstrumentId");
  });

  it("rejects InstrumentId symbols containing colons", () => {
    expect(() =>
      toInstrumentId({
        market: "KR",
        exchange: "XKRX",
        symbol: "005930:EXTRA",
      }),
    ).toThrow("InstrumentId symbol must not contain ':'");
  });

  it("defines the default Strategy Profile AI weighting", () => {
    expect(defaultSwingMomentumProfile.aiWeight).toBe(0.4);
    expect(defaultSwingMomentumProfile.rulesWeight).toBe(0.6);
    expect(defaultSwingMomentumProfile.aiWeightRange).toEqual({
      min: 0.2,
      max: 0.6,
    });
  });

  it("distinguishes Provisional Signal from Confirmed Signal", () => {
    expect(isProvisionalSignal({ finality: "provisional" })).toBe(true);
    expect(isProvisionalSignal({ finality: "confirmed" })).toBe(false);
    expect(isConfirmedSignal({ finality: "confirmed" })).toBe(true);
    expect(isConfirmedSignal({ finality: "provisional" })).toBe(false);
  });

  it("represents source evidence on SignalDecision values", () => {
    const decision: SignalDecision = {
      instrumentId: "KR:XKRX:005930",
      finality: "confirmed",
      confidence: 0.72,
      rulesContribution: 0.5,
      aiContribution: 0.22,
      aiWeightHaircut: 0,
      qualityFlags: ["confirmed_end_of_day_data"],
      sourceEvidence: [
        {
          sourceId: "krx-disclosure-1",
          sourceType: "disclosure",
          title: "Samsung Electronics disclosure",
          url: "https://example.com/disclosure",
          observedAt: "2026-06-18T00:00:00.000Z",
          finality: "confirmed",
        },
      ],
      tradeTimingPlan: {
        actionLabel: "BUY",
        entryZone: { low: 70000, high: 72000 },
        stopLevel: 68000,
        targetZone: { low: 78000, high: 80000 },
        timeHorizon: "days_to_weeks",
      },
      rationale: ["Confirmed disclosure supports the signal."],
    };

    expect(decision.sourceEvidence).toHaveLength(1);
    expect(decision.sourceEvidence[0].sourceType).toBe("disclosure");
  });

  it("allows source evidence to fall back to URL and title when sourceId is absent", () => {
    const source: SignalDecision["sourceEvidence"][number] = {
      sourceType: "news",
      title: "Samsung Electronics coverage",
      url: "https://example.com/samsung-news",
      observedAt: "2026-06-18T00:00:00.000Z",
      finality: "confirmed",
    };

    expect(source.title).toBe("Samsung Electronics coverage");
  });
});
