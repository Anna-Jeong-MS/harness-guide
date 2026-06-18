import { describe, expect, it } from "vitest";
import { parseInstrumentId, toInstrumentId } from "../src/domain/market";
import { defaultSwingMomentumProfile } from "../src/domain/strategy";
import { isConfirmedSignal, isProvisionalSignal } from "../src/domain/signals";

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
    expect(isConfirmedSignal({ finality: "confirmed" })).toBe(true);
  });
});
