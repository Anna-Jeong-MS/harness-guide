import type { OhlcvBar, QualityFlag } from "../../domain/market";
import { parseInstrumentId } from "../../domain/market";
import type { FetchJson, MarketDataProvider } from "./interface";

type PolygonConfig = {
  baseUrl: string;
  apiKey: string;
  fetchJson?: FetchJson;
};

type PolygonAggregateResponse = {
  results: Array<{
    o: number;
    h: number;
    l: number;
    c: number;
    v: number;
  }>;
};

export function createPolygonProvider(config: PolygonConfig): MarketDataProvider {
  const fetchJson = config.fetchJson ?? defaultFetchJson;

  return {
    async fetchSnapshot(request) {
      const bars: OhlcvBar[] = [];

      for (const instrumentId of request.instruments) {
        const parts = parseInstrumentId(instrumentId);
        const url = new URL(
          `${config.baseUrl.replace(/\/$/, "")}/v2/aggs/ticker/${encodeURIComponent(parts.symbol)}/prev`,
        );
        url.searchParams.set("apiKey", config.apiKey);
        const response = (await fetchJson(url.toString())) as PolygonAggregateResponse;
        const latest = response.results?.[0];
        if (!latest) {
          throw new Error(`Polygon returned no aggregate for ${instrumentId}`);
        }

        bars.push({
          instrumentId,
          asOf: request.asOf,
          open: latest.o,
          high: latest.h,
          low: latest.l,
          close: latest.c,
          volume: latest.v,
          finality: request.finality,
        });
      }

      const qualityFlags: QualityFlag[] =
        request.finality === "confirmed"
          ? ["confirmed_end_of_day_data"]
          : ["delayed_intraday_data"];

      return {
        asOf: request.asOf,
        finality: request.finality,
        bars,
        qualityFlags,
      };
    },
  };
}

async function defaultFetchJson(url: string, init?: RequestInit): Promise<unknown> {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(`Polygon request failed with ${response.status}`);
  }
  return response.json();
}
