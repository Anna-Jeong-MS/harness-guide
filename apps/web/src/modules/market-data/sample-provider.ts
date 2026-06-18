import type { MarketSnapshot, OhlcvBar, QualityFlag } from "../../domain/market";
import type { MarketDataProvider } from "./interface";

export function createSampleMarketDataProvider(): MarketDataProvider {
  return {
    async fetchSnapshot(request) {
      const bars: OhlcvBar[] = request.instruments.map((instrumentId, index) => ({
        instrumentId,
        asOf: request.asOf,
        open: 100 + index,
        high: 110 + index,
        low: 95 + index,
        close: 108 + index,
        volume: 1_000_000 + index,
        finality: request.finality,
      }));

      const qualityFlags: QualityFlag[] =
        request.finality === "confirmed"
          ? ["confirmed_end_of_day_data"]
          : ["delayed_intraday_data"];

      const snapshot: MarketSnapshot = {
        asOf: request.asOf,
        finality: request.finality,
        bars,
        qualityFlags,
      };

      return snapshot;
    },
  };
}
