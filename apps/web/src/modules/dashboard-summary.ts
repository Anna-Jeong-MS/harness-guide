import type { InstrumentSearchResult } from "./instrument-search";
import type { SearchResultCard } from "./search-result-assembler";
import { describeSearchIntent } from "./search-intent";
import { formatPercent, formatPrice, formatPriceRange } from "./formatters";

export type DashboardSummaryInput = {
  query: string;
  searchResult: InstrumentSearchResult;
  searchCards: SearchResultCard[];
};

export function renderDashboardSummary(input: DashboardSummaryInput): string {
  return [
    '<section class="workspace-shell">',
    '<header class="terminal-header">',
    "<p>Professional Stock Signal Workspace</p>",
    "<h1>Natural language stock search</h1>",
    "<p>Decision-support only. Professional review required before external use.</p>",
    "</header>",
    renderSearchForm(input.query),
    renderIntent(input.searchResult),
    renderCards(input.searchResult, input.searchCards),
    "</section>",
  ].join("");
}

function renderSearchForm(query: string): string {
  return [
    '<form method="get" action="/">',
    '<section class="search-command">',
    '<fieldset class="mode-chips">',
    "<legend>Search modes</legend>",
    '<span class="mode-chip">Stock Lookup</span>',
    '<span class="mode-chip">Investment Idea Screen</span>',
    "</fieldset>",
    '<label for="q">Natural language query</label>',
    `<input id="q" name="q" value="${escapeHtml(query)}" placeholder="US AI infrastructure BUY candidates" />`,
    '<button type="submit">Search</button>',
    "</section>",
    "</form>",
  ].join("");
}

function renderIntent(result: InstrumentSearchResult): string {
  const heading = result.intent.ambiguity === "lookup_first" ? "Lookup-first results" : "Interpreted Search Intent";
  return [
    "<section>",
    `<h2>${heading}</h2>`,
    ...describeSearchIntent(result.intent).map((line) => `<p>${escapeHtml(line)}</p>`),
    result.relatedScreenCandidates.length > 0 ? "<h3>Related Investment Idea Screens</h3>" : "",
    result.relatedScreenCandidates.length > 0
      ? `<ul class="related-screen-candidates">${result.relatedScreenCandidates
          .map((candidate) => `<li>${escapeHtml(candidate.displayName)} (${escapeHtml(candidate.instrumentId)})</li>`)
          .join("")}</ul>`
      : "",
    result.portfolioState.message ? `<p>${escapeHtml(result.portfolioState.message)}</p>` : "",
    "</section>",
  ].join("");
}

function renderCards(result: InstrumentSearchResult, cards: SearchResultCard[]): string {
  if (result.noMatch && cards.length === 0) {
    return [
      "<section><h2>No instruments matched</h2>",
      `<p>Understood terms: ${escapeHtml(result.noMatch.understoodTerms.join(", "))}</p>`,
      ...result.noMatch.suggestedPrompts.map((prompt) => `<p>${escapeHtml(prompt)}</p>`),
      "</section>",
    ].join("");
  }

  return ['<section><h2>Ranked candidates</h2><div class="candidate-grid">', ...cards.map(renderCard), "</div></section>"].join("");
}

function renderCard(card: SearchResultCard): string {
  const actionClass = card.actionLabel === "BUY" ? "action-buy" : card.actionLabel === "HOLD" ? "action-hold" : card.actionLabel === "SELL" ? "action-sell" : "action-review";
  return [
    '<article class="search-result-card">',
    `<h3>${escapeHtml(card.displayName)} <span>${escapeHtml(card.instrumentId)}</span></h3>`,
    `<p><span class="action-badge ${actionClass}">${escapeHtml(card.actionLabel)}</span> · Confidence ${formatPercent(card.confidence)} · ${escapeHtml(card.finality)}</p>`,
    "<p>Decision-support only. Review Required conditions and conflicting evidence must be checked in detail.</p>",
    `<p>Entry ${formatPriceRange(card.tradeTimingPlan.entryZone)} · Stop ${formatPrice(card.tradeTimingPlan.stopLevel)} · Target ${formatPriceRange(card.tradeTimingPlan.targetZone)}</p>`,
    `<p>Screening Evidence: ${escapeHtml(card.screeningEvidenceQuality ? card.screeningEvidenceQuality : "not applicable")}</p>`,
    ...renderScreeningEvidenceDetails(card),
    `<p>AI contribution: ${formatPercent(card.aiContribution)} · AI Weight Haircut: ${formatPercent(card.aiWeightHaircut)}</p>`,
    ...card.rankingBreakdown.map((line) => `<p>${escapeHtml(line)}</p>`),
    card.portfolioStateMessage ? `<p>${escapeHtml(card.portfolioStateMessage)}</p>` : "",
    `<a href="${escapeHtml(card.detailHref)}">Open research detail</a>`,
    "</article>",
  ].join("");
}

function renderScreeningEvidenceDetails(card: SearchResultCard): string[] {
  if (!card.screeningEvidence) {
    return [];
  }
  return [
    card.screeningEvidence.structuredCriteria.length > 0
      ? `<p>Criteria: ${escapeHtml(card.screeningEvidence.structuredCriteria.join(", "))}</p>`
      : "",
    ...card.screeningEvidence.sources.map(
      (source) =>
        `<p>Source: ${escapeHtml(source.title)} · ${escapeHtml(source.sourceType)} · ${escapeHtml(source.finality)} · <a href="${escapeHtml(source.url)}">${escapeHtml(source.url)}</a></p>`,
    ),
    card.screeningEvidence.weaknessReason ? `<p>${escapeHtml(card.screeningEvidence.weaknessReason)}</p>` : "",
  ];
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
