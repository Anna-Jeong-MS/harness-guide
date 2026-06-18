import type { DataFinality, InstrumentId, QualityFlag } from "../domain/market";
import type { PortfolioActionLabel } from "../domain/portfolio";
import type { ActionLabel, TradeTimingPlan } from "../domain/signals";
import type { InstrumentSearchCandidate, InstrumentSearchResult, ScreeningEvidence } from "./instrument-search";
import type { SearchMode } from "./search-intent";

export type SearchResultCard = {
  instrumentId: InstrumentId;
  displayName: string;
  primaryMode: SearchMode;
  actionLabel: ActionLabel;
  confidence: number;
  finality: DataFinality;
  tradeTimingPlan: TradeTimingPlan;
  aiContribution: number;
  aiWeightHaircut: number;
  portfolioAction: PortfolioActionLabel;
  screeningEvidenceQuality?: "strong" | "weak";
  screeningEvidence?: ScreeningEvidence;
  qualityFlags: QualityFlag[];
  rankingBreakdown: string[];
  portfolioStateMessage?: string;
  detailHref: string;
};

type SignalFixture = Omit<
  SearchResultCard,
  | "displayName"
  | "primaryMode"
  | "screeningEvidenceQuality"
  | "screeningEvidence"
  | "qualityFlags"
  | "rankingBreakdown"
  | "portfolioStateMessage"
  | "detailHref"
>;

const signals: Record<InstrumentId, SignalFixture> = {
  "KR:XKRX:005930": signal("KR:XKRX:005930", "HOLD", 0.64, { low: 71000, high: 73500 }, 67500, { low: 79000, high: 82500 }, 0.21, 0.08, "REVIEW_REQUIRED"),
  "KR:XKRX:000830": signal("KR:XKRX:000830", "HOLD", 0.57, { low: 154000, high: 159000 }, 148000, { low: 171000, high: 178000 }, 0.18, 0, "HOLD_AND_MONITOR"),
  "US:XNAS:AAPL": signal("US:XNAS:AAPL", "BUY", 0.82, { low: 198, high: 204 }, 188, { low: 224, high: 232 }, 0.4, 0, "NEW_BUY_CANDIDATE"),
  "US:XNAS:NVDA": signal("US:XNAS:NVDA", "BUY", 0.88, { low: 118, high: 124 }, 109, { low: 138, high: 146 }, 0.42, 0.06, "ADD_ON_CANDIDATE"),
};

export function assembleSearchResultCards(result: InstrumentSearchResult): SearchResultCard[] {
  return result.primaryCandidates
    .flatMap((candidate) => {
      const signalFixture = signals[candidate.instrumentId];
      if (!signalFixture) {
        return [];
      }
      const screeningEvidenceQuality = candidate.screeningEvidence?.quality;
      const scores = rankingScores(candidate, signalFixture.confidence);
      return [{
        card: {
          ...signalFixture,
          displayName: candidate.displayName,
          primaryMode: candidate.primaryMode,
          ...(screeningEvidenceQuality ? { screeningEvidenceQuality } : {}),
          ...(candidate.screeningEvidence ? { screeningEvidence: candidate.screeningEvidence } : {}),
          qualityFlags: candidate.qualityFlags,
          rankingBreakdown: rankingBreakdown(scores),
          ...(!result.portfolioState.available && result.portfolioState.message
            ? { portfolioStateMessage: result.portfolioState.message }
            : {}),
          detailHref: `/signals/${encodeURIComponent(candidate.instrumentId)}`,
        },
        scores,
      }];
    })
    .sort((left, right) => compareRankingScores(right.scores, left.scores))
    .map(({ card }) => card);
}

type RankingScores = {
  searchIntentFit: number;
  confirmedSignalConfidence: number;
  screeningEvidenceQuality: number;
  portfolioRelevance: number;
  riskPenalty: number;
};

function rankingBreakdown(scores: RankingScores): string[] {
  return [
    `Search Intent fit: ${scores.searchIntentFit}`,
    `Confirmed Signal confidence: ${scores.confirmedSignalConfidence}`,
    `Screening Evidence quality: ${scores.screeningEvidenceQuality}`,
    `Portfolio relevance: ${scores.portfolioRelevance}`,
    `Risk penalty: ${scores.riskPenalty}`,
  ];
}

function rankingScores(candidate: InstrumentSearchCandidate, confidence: number): RankingScores {
  return {
    searchIntentFit: Math.min(1, candidate.matchReasons.length / 2),
    confirmedSignalConfidence: confidence,
    screeningEvidenceQuality: screeningEvidenceScore(candidate.screeningEvidence),
    portfolioRelevance: candidate.matchReasons.includes("portfolio_risk_match") ? 1 : 0,
    riskPenalty: candidate.qualityFlags.includes("high_volatility") ? -0.2 : 0,
  };
}

function screeningEvidenceScore(screeningEvidence: ScreeningEvidence | undefined): number {
  if (!screeningEvidence) {
    return 0;
  }
  if (
    screeningEvidence.quality === "strong" &&
    screeningEvidence.structuredCriteria.length > 0 &&
    screeningEvidence.sources.length > 0
  ) {
    return 1;
  }
  return 0.35;
}

function compareRankingScores(left: RankingScores, right: RankingScores): number {
  return (
    left.searchIntentFit - right.searchIntentFit ||
    left.confirmedSignalConfidence - right.confirmedSignalConfidence ||
    left.screeningEvidenceQuality - right.screeningEvidenceQuality ||
    left.portfolioRelevance - right.portfolioRelevance ||
    left.riskPenalty - right.riskPenalty
  );
}

function signal(
  instrumentId: InstrumentId,
  actionLabel: ActionLabel,
  confidence: number,
  entryZone: { low: number; high: number },
  stopLevel: number,
  targetZone: { low: number; high: number },
  aiContribution: number,
  aiWeightHaircut: number,
  portfolioAction: PortfolioActionLabel,
): SignalFixture {
  return {
    instrumentId,
    actionLabel,
    confidence,
    finality: "confirmed",
    tradeTimingPlan: {
      actionLabel,
      entryZone,
      stopLevel,
      targetZone,
      timeHorizon: "days_to_weeks",
    },
    aiContribution,
    aiWeightHaircut,
    portfolioAction,
  };
}
