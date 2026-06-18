import type { InstrumentId, Market, QualityFlag } from "../domain/market";
import type { EvidenceSource } from "../domain/signals";
import { parseSearchIntent, type SearchIntent, type SearchMode } from "./search-intent";

export type MatchReason =
  | "ticker_match"
  | "company_alias_match"
  | "theme_match"
  | "signal_filter_match"
  | "portfolio_risk_match";

export type ScreeningEvidence = {
  quality: "strong" | "weak";
  structuredCriteria: string[];
  sources: EvidenceSource[];
  weaknessReason?: string;
};

export type InstrumentSearchCandidate = {
  instrumentId: InstrumentId;
  displayName: string;
  market: Market;
  ticker: string;
  primaryMode: SearchMode;
  themes: string[];
  sectors: string[];
  matchReasons: MatchReason[];
  qualityFlags: QualityFlag[];
  screeningEvidence?: ScreeningEvidence;
};

export type InstrumentSearchResult = {
  intent: SearchIntent;
  primaryCandidates: InstrumentSearchCandidate[];
  relatedScreenCandidates: InstrumentSearchCandidate[];
  portfolioState: {
    available: boolean;
    message?: string;
  };
  noMatch?: {
    understoodTerms: string[];
    suggestedPrompts: string[];
  };
};

type InstrumentCatalogEntry = {
  instrumentId: InstrumentId;
  displayName: string;
  market: Market;
  ticker: string;
  aliases: string[];
  themes: string[];
  sectors: string[];
  defaultQualityFlags: QualityFlag[];
};

const catalog: InstrumentCatalogEntry[] = [
  entry("KR:XKRX:005930", "Samsung Electronics", "KR", "005930", ["samsung electronics", "samsung", "삼성전자", "삼성"], ["ai_infrastructure", "memory_semiconductor", "korea_large_cap"], ["semiconductors", "hardware"], ["confirmed_end_of_day_data"]),
  entry("KR:XKRX:000830", "Samsung C&T", "KR", "000830", ["samsung c&t", "samsung", "삼성물산", "삼성"], ["korea_large_cap", "dividend_stability"], ["industrials"], ["confirmed_end_of_day_data"]),
  entry("US:XNAS:AAPL", "Apple", "US", "AAPL", ["apple", "aapl", "애플"], ["quality_growth", "consumer_ai"], ["hardware", "consumer_technology"], ["confirmed_end_of_day_data"]),
  entry("US:XNAS:NVDA", "NVIDIA", "US", "NVDA", ["nvidia", "nvda", "엔비디아"], ["ai_infrastructure", "semiconductors"], ["semiconductors"], ["high_volatility"]),
];

export function searchInstruments(
  query: string,
  options: { portfolioAvailable?: boolean } = {},
): InstrumentSearchResult {
  const intent = parseSearchIntent(query);
  const portfolioAvailable = options.portfolioAvailable !== false;
  const allCandidates = intent.modes.flatMap((mode) => collectCandidates(intent, mode, portfolioAvailable));
  const primaryCandidates = uniqueCandidates(
    allCandidates.filter((candidate) => candidate.primaryMode === intent.primaryMode),
  );
  const relatedScreenCandidates =
    intent.primaryMode === "investment_idea_screen"
      ? []
      : uniqueCandidates(allCandidates.filter((candidate) => candidate.primaryMode === "investment_idea_screen"));

  const portfolioState = {
    available: portfolioAvailable,
    ...(!portfolioAvailable
      ? { message: "Portfolio unavailable; portfolio conditions were not included in ranking." }
      : {}),
  };

  if (primaryCandidates.length === 0 && relatedScreenCandidates.length === 0) {
    return {
      intent,
      primaryCandidates,
      relatedScreenCandidates,
      portfolioState,
      noMatch: {
        understoodTerms: intent.normalizedQuery.split(/\s+/).filter(Boolean),
        suggestedPrompts: [
          "Try Stock Lookup with Samsung Electronics, Apple, 005930, or AAPL.",
          "Try Investment Idea Screen with US AI infrastructure BUY candidates.",
          "Try a portfolio query after importing or selecting a Portfolio.",
        ],
      },
    };
  }

  return {
    intent,
    primaryCandidates,
    relatedScreenCandidates,
    portfolioState,
  };
}

function collectCandidates(
  intent: SearchIntent,
  mode: SearchMode,
  portfolioAvailable: boolean,
): InstrumentSearchCandidate[] {
  return catalog
    .map((item) => {
      const matchReasons = collectMatchReasons(item, intent, mode, portfolioAvailable);
      return { item, matchReasons };
    })
    .filter(({ item, matchReasons }) => {
      if (intent.market && item.market !== intent.market) {
        return false;
      }
      return matchReasons.length > 0;
    })
    .map(({ item, matchReasons }) => ({
      instrumentId: item.instrumentId,
      displayName: item.displayName,
      market: item.market,
      ticker: item.ticker,
      primaryMode: mode,
      themes: item.themes,
      sectors: item.sectors,
      matchReasons,
      qualityFlags: item.defaultQualityFlags,
      ...(mode === "investment_idea_screen" ? { screeningEvidence: buildScreeningEvidence(item, intent) } : {}),
    }));
}

function collectMatchReasons(
  item: InstrumentCatalogEntry,
  intent: SearchIntent,
  mode: SearchMode,
  portfolioAvailable: boolean,
): MatchReason[] {
  const reasons = new Set<MatchReason>();
  if (mode === "stock_lookup") {
    if (intent.normalizedQuery === item.ticker.toLowerCase() || intent.normalizedQuery.includes(item.ticker.toLowerCase())) {
      reasons.add("ticker_match");
    }
    if (
      reasons.size === 0 &&
      item.aliases.some((alias) => intent.normalizedQuery.includes(alias.toLowerCase()))
    ) {
      reasons.add("company_alias_match");
    }
  }
  if (mode === "investment_idea_screen") {
    if (
      intent.ambiguity === "lookup_first" &&
      item.aliases.some((alias) => intent.normalizedQuery.includes(alias.toLowerCase()))
    ) {
      reasons.add("company_alias_match");
    }
    if (intent.themes.some((theme) => item.themes.includes(theme))) {
      reasons.add("theme_match");
    }
    if (intent.sectors.some((sector) => item.sectors.includes(sector))) {
      reasons.add("theme_match");
    }
    if (intent.actionLabels.includes("BUY") && item.themes.includes("ai_infrastructure")) {
      reasons.add("signal_filter_match");
    }
    if (intent.portfolioScope && portfolioAvailable && item.instrumentId === "KR:XKRX:005930") {
      reasons.add("portfolio_risk_match");
    }
  }
  return Array.from(reasons);
}

function buildScreeningEvidence(
  item: InstrumentCatalogEntry,
  intent: SearchIntent,
): ScreeningEvidence {
  const matchedAliases = item.aliases.filter((alias) => intent.normalizedQuery.includes(alias.toLowerCase()));
  const companyFamilyCriteria = matchedAliases.some((alias) => ["samsung", "삼성"].includes(alias.toLowerCase()))
    ? ["company_family:samsung"]
    : [];
  const structuredCriteria = [
    ...matchedAliases.map((alias) => `alias:${alias}`),
    ...companyFamilyCriteria,
    ...intent.themes.map((theme) => `theme:${theme}`),
    ...intent.actionLabels.map((label) => `action:${label}`),
    ...(intent.market ? [`market:${intent.market}`] : []),
  ];
  const strong =
    item.instrumentId === "US:XNAS:NVDA" &&
    intent.themes.includes("ai_infrastructure") &&
    intent.actionLabels.includes("BUY");
  return {
    quality: strong ? "strong" : "weak",
    structuredCriteria,
    sources: strong
      ? [
          {
            sourceType: "news",
            title: "AI infrastructure demand update",
            url: "https://example.com/ai-infrastructure-demand",
            observedAt: "2026-06-18T00:00:00.000Z",
            finality: "confirmed",
          },
        ]
      : [],
    ...(!strong ? { weaknessReason: "Matched by structured criteria without enough cited source material." } : {}),
  };
}

function uniqueCandidates(candidates: InstrumentSearchCandidate[]): InstrumentSearchCandidate[] {
  const seen = new Set<string>();
  return candidates.filter((candidate) => {
    const key = `${candidate.primaryMode}:${candidate.instrumentId}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function entry(
  instrumentId: InstrumentId,
  displayName: string,
  market: Market,
  ticker: string,
  aliases: string[],
  themes: string[],
  sectors: string[],
  defaultQualityFlags: QualityFlag[],
): InstrumentCatalogEntry {
  return { instrumentId, displayName, market, ticker, aliases, themes, sectors, defaultQualityFlags };
}
