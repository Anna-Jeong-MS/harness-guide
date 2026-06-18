import type { Market } from "../domain/market";
import type { ActionLabel } from "../domain/signals";

export type SearchMode = "stock_lookup" | "investment_idea_screen";

export type SearchIntentFilter =
  | "company"
  | "ticker"
  | "market"
  | "sector"
  | "theme"
  | "signal_state"
  | "risk"
  | "portfolio_risk";

export type SearchIntent = {
  rawQuery: string;
  normalizedQuery: string;
  primaryMode: SearchMode;
  modes: SearchMode[];
  filters: SearchIntentFilter[];
  market?: Market;
  themes: string[];
  sectors: string[];
  actionLabels: ActionLabel[];
  portfolioScope?: "selected_portfolio";
  ambiguity?: "lookup_first";
};

const knownCompanyTerms = ["삼성전자", "삼성", "samsung", "apple", "nvidia"];

export function parseSearchIntent(query: string): SearchIntent {
  const rawQuery = query.trim();
  const normalizedQuery = rawQuery.toLowerCase();
  const filters = new Set<SearchIntentFilter>();
  const themes = new Set<string>();
  const sectors = new Set<string>();
  const actionLabels = new Set<ActionLabel>();
  const modes = new Set<SearchMode>();
  let market: Market | undefined;
  let portfolioScope: "selected_portfolio" | undefined;

  if (/\b(us|nasdaq|nyse)\b/.test(normalizedQuery) || normalizedQuery.includes("미국")) {
    market = "US";
    filters.add("market");
    modes.add("investment_idea_screen");
  }

  if (/\b(kr|korea)\b/.test(normalizedQuery) || hasKoreanTerm(normalizedQuery, ["한국", "국내", "코스피", "코스닥"])) {
    market = "KR";
    filters.add("market");
    modes.add("investment_idea_screen");
  }

  if (/\b(ai|infrastructure)\b/.test(normalizedQuery) || hasKoreanTerm(normalizedQuery, ["인공지능", "인프라"])) {
    themes.add("ai_infrastructure");
    filters.add("theme");
    modes.add("investment_idea_screen");
  }

  if (/\bdividend\b/.test(normalizedQuery) || normalizedQuery.includes("배당")) {
    themes.add("dividend_stability");
    filters.add("theme");
    modes.add("investment_idea_screen");
  }

  if (/\bsemiconductor\b/.test(normalizedQuery) || normalizedQuery.includes("반도체")) {
    sectors.add("semiconductors");
    filters.add("sector");
    modes.add("investment_idea_screen");
  }

  if (/\bbuy\b/.test(normalizedQuery) || normalizedQuery.includes("매수")) {
    actionLabels.add("BUY");
    filters.add("signal_state");
    modes.add("investment_idea_screen");
  }

  if (/\bhold\b/.test(normalizedQuery) || hasKoreanTerm(normalizedQuery, ["보유", "관망"])) {
    actionLabels.add("HOLD");
    filters.add("signal_state");
    modes.add("investment_idea_screen");
  }

  if (/\bsell\b/.test(normalizedQuery) || normalizedQuery.includes("매도")) {
    actionLabels.add("SELL");
    filters.add("signal_state");
    modes.add("investment_idea_screen");
  }

  if (
    /\b(portfolio|holding|holdings|risk)\b/.test(normalizedQuery) ||
    hasKoreanTerm(normalizedQuery, ["포트폴리오", "보유", "손절", "리스크"])
  ) {
    portfolioScope = "selected_portfolio";
    filters.add("portfolio_risk");
    modes.add("investment_idea_screen");
  }

  if (/^[a-z]{1,5}$/.test(normalizedQuery) || /^\d{6}$/.test(normalizedQuery)) {
    filters.add("ticker");
    modes.add("stock_lookup");
  }

  if (knownCompanyTerms.some((term) => normalizedQuery.includes(term))) {
    filters.add("company");
    modes.add("stock_lookup");
  }

  if (modes.size === 0) {
    modes.add("stock_lookup");
  }

  const ambiguity = normalizedQuery === "삼성" || normalizedQuery === "samsung" ? "lookup_first" : undefined;
  if (ambiguity) {
    modes.add("investment_idea_screen");
  }

  const modeList = orderModes(Array.from(modes), ambiguity);

  return {
    rawQuery,
    normalizedQuery,
    primaryMode: modeList[0],
    modes: modeList,
    filters: Array.from(filters),
    ...(market ? { market } : {}),
    themes: Array.from(themes),
    sectors: Array.from(sectors),
    actionLabels: Array.from(actionLabels),
    ...(portfolioScope ? { portfolioScope } : {}),
    ...(ambiguity ? { ambiguity } : {}),
  };
}

export function describeSearchIntent(intent: SearchIntent): string[] {
  const lines = [`Mode: ${formatMode(intent.primaryMode)}`];
  if (intent.market) {
    lines.push(`Market: ${intent.market}`);
  }
  if (intent.themes.length > 0) {
    lines.push(`Themes: ${intent.themes.join(", ")}`);
  }
  if (intent.actionLabels.length > 0) {
    lines.push(`Action Labels: ${intent.actionLabels.join(", ")}`);
  }
  if (intent.portfolioScope) {
    lines.push("Portfolio Scope: selected portfolio");
  }
  return lines;
}

function orderModes(modes: SearchMode[], ambiguity?: "lookup_first"): SearchMode[] {
  if (ambiguity) {
    return ["stock_lookup", "investment_idea_screen"];
  }
  if (modes.includes("investment_idea_screen") && !modes.includes("stock_lookup")) {
    return ["investment_idea_screen"];
  }
  if (modes.includes("stock_lookup") && !modes.includes("investment_idea_screen")) {
    return ["stock_lookup"];
  }
  return ["stock_lookup", "investment_idea_screen"];
}

function formatMode(mode: SearchMode): string {
  return mode === "stock_lookup" ? "Stock Lookup" : "Investment Idea Screen";
}

function hasKoreanTerm(query: string, terms: string[]): boolean {
  return terms.some((term) => query.includes(term));
}
