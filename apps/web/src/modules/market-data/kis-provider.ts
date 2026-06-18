import type { OhlcvBar, QualityFlag } from "../../domain/market";
import { parseInstrumentId } from "../../domain/market";
import type { FetchJson, MarketDataProvider } from "./interface";

type KisConfig = {
  baseUrl: string;
  appKey: string;
  appSecret: string;
  fetchJson?: FetchJson;
};

type KisPriceOutput = {
  output: {
    stck_oprc: string;
    stck_hgpr: string;
    stck_lwpr: string;
    stck_prpr: string;
    acml_vol: string;
  };
};

export function createKisProvider(config: KisConfig): MarketDataProvider {
  const fetchJson = config.fetchJson ?? defaultFetchJson;

  return {
    async fetchSnapshot(request) {
      const bars: OhlcvBar[] = [];

      for (const instrumentId of request.instruments) {
        const parts = parseInstrumentId(instrumentId);
        const url = new URL(`${config.baseUrl.replace(/\/$/, "")}/price`);
        url.searchParams.set("exchange", parts.exchange);
        url.searchParams.set("symbol", parts.symbol);
        const response = (await fetchJson(url.toString(), {
          headers: {
            appkey: config.appKey,
            appsecret: config.appSecret,
          },
        })) as KisPriceOutput;

        bars.push({
          instrumentId,
          asOf: request.asOf,
          open: Number(response.output.stck_oprc),
          high: Number(response.output.stck_hgpr),
          low: Number(response.output.stck_lwpr),
          close: Number(response.output.stck_prpr),
          volume: Number(response.output.acml_vol),
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
    throw new Error(`KIS request failed with ${response.status}`);
  }
  return response.json();
}
