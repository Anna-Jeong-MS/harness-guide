export type Market = "KR" | "US";

export type Exchange = "XKRX" | "XKOSDAQ" | "XNYS" | "XNAS";

export type InstrumentId = `${Market}:${Exchange}:${string}`;

export type InstrumentParts = {
  market: Market;
  exchange: Exchange;
  symbol: string;
};

export function toInstrumentId(parts: InstrumentParts): InstrumentId {
  if (parts.symbol.trim().length === 0) {
    throw new Error("InstrumentId symbol must not be empty");
  }
  return `${parts.market}:${parts.exchange}:${parts.symbol}` as InstrumentId;
}

export function parseInstrumentId(instrumentId: InstrumentId): InstrumentParts {
  const [market, exchange, symbol] = instrumentId.split(":");
  if (
    (market !== "KR" && market !== "US") ||
    !["XKRX", "XKOSDAQ", "XNYS", "XNAS"].includes(exchange) ||
    !symbol
  ) {
    throw new Error(`Invalid InstrumentId: ${instrumentId}`);
  }
  return { market, exchange: exchange as Exchange, symbol };
}

export type DataFinality = "provisional" | "confirmed";

export type QualityFlag =
  | "delayed_intraday_data"
  | "confirmed_end_of_day_data"
  | "missing_price_data"
  | "missing_event_data"
  | "weak_ai_source_evidence"
  | "conflicting_news_or_disclosures"
  | "insufficient_backtest_sample"
  | "high_portfolio_concentration"
  | "high_volatility";

export type OhlcvBar = {
  instrumentId: InstrumentId;
  asOf: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  finality: DataFinality;
};

export type MarketSnapshot = {
  asOf: string;
  finality: DataFinality;
  bars: OhlcvBar[];
  qualityFlags: QualityFlag[];
};
