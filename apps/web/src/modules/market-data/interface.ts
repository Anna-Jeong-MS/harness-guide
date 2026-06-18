import type { DataFinality, InstrumentId, MarketSnapshot } from "../../domain/market";

export type MarketDataRequest = {
  instruments: InstrumentId[];
  asOf: string;
  finality: DataFinality;
};

export type MarketDataProvider = {
  fetchSnapshot(request: MarketDataRequest): Promise<MarketSnapshot>;
};

export type FetchJson = (url: string, init?: RequestInit) => Promise<unknown>;
