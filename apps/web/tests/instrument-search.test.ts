import { describe, expect, it } from "vitest";
import { searchInstruments } from "../src/modules/instrument-search";

describe("Instrument search", () => {
  it("returns Stock Lookup matches for company and ticker queries", () => {
    expect(searchInstruments("삼성전자").primaryCandidates[0]).toMatchObject({
      instrumentId: "KR:XKRX:005930",
      displayName: "Samsung Electronics",
      primaryMode: "stock_lookup",
      matchReasons: ["company_alias_match"],
    });

    expect(searchInstruments("AAPL").primaryCandidates[0]).toMatchObject({
      instrumentId: "US:XNAS:AAPL",
      displayName: "Apple",
      primaryMode: "stock_lookup",
      matchReasons: ["ticker_match"],
    });
  });

  it("returns lookup-first primary candidates and related screen candidates for ambiguous queries", () => {
    const result = searchInstruments("삼성");

    expect(result.intent.ambiguity).toBe("lookup_first");
    expect(result.primaryCandidates.map((candidate) => candidate.instrumentId)).toEqual([
      "KR:XKRX:005930",
      "KR:XKRX:000830",
    ]);
    expect(result.relatedScreenCandidates.map((candidate) => candidate.instrumentId)).toContain("KR:XKRX:005930");
  });

  it("explains ambiguous related Investment Idea Screen candidates with weak structured Screening Evidence", () => {
    const result = searchInstruments("삼성");

    expect(result.relatedScreenCandidates.length).toBeGreaterThan(0);
    expect(result.relatedScreenCandidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          instrumentId: "KR:XKRX:005930",
          primaryMode: "investment_idea_screen",
          screeningEvidence: expect.objectContaining({
            quality: "weak",
            structuredCriteria: expect.arrayContaining(["alias:삼성", "company_family:samsung"]),
            sources: [],
            weaknessReason: "Matched by structured criteria without enough cited source material.",
          }),
        }),
      ]),
    );
    expect(
      result.relatedScreenCandidates.every(
        (candidate) => (candidate.screeningEvidence?.structuredCriteria.length ?? 0) > 0,
      ),
    ).toBe(true);
  });

  it("requires structured criteria and cited evidence for Investment Idea Screen matches", () => {
    const result = searchInstruments("US AI infrastructure BUY candidates");
    const nvidia = result.primaryCandidates[0];

    expect(nvidia.primaryMode).toBe("investment_idea_screen");
    expect(nvidia.screeningEvidence).toMatchObject({
      quality: "strong",
      structuredCriteria: ["theme:ai_infrastructure", "action:BUY", "market:US"],
    });
    expect(nvidia.screeningEvidence?.sources[0]).toMatchObject({
      sourceType: "news",
      title: "AI infrastructure demand update",
      finality: "confirmed",
    });
  });

  it("marks tag-only screen matches as weak Screening Evidence", () => {
    const result = searchInstruments("배당 안정적인 한국 대형주");

    expect(result.primaryCandidates[0].screeningEvidence).toMatchObject({
      quality: "weak",
      weaknessReason: "Matched by structured criteria without enough cited source material.",
    });
  });

  it("keeps portfolio searches runnable when Portfolio is unavailable", () => {
    const result = searchInstruments("내 포트폴리오에서 손절 가까운 종목", {
      portfolioAvailable: false,
    });

    expect(result.portfolioState).toEqual({
      available: false,
      message: "Portfolio unavailable; portfolio conditions were not included in ranking.",
    });
    expect(result.primaryCandidates).toEqual([]);
    expect(result.relatedScreenCandidates).toEqual([]);
    expect(result.noMatch?.suggestedPrompts).toContain("Try a portfolio query after importing or selecting a Portfolio.");
  });

  it("excludes unavailable Portfolio conditions from candidate reasons while keeping non-portfolio screen criteria", () => {
    const result = searchInstruments("내 포트폴리오에서 US AI infrastructure BUY candidates", {
      portfolioAvailable: false,
    });

    expect(result.primaryCandidates.map((candidate) => candidate.instrumentId)).toContain("US:XNAS:NVDA");
    expect(result.primaryCandidates).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          instrumentId: "KR:XKRX:005930",
        }),
      ]),
    );
    expect(result.primaryCandidates.flatMap((candidate) => candidate.matchReasons)).not.toContain("portfolio_risk_match");
  });

  it("does not duplicate primary Investment Idea Screen candidates as related candidates", () => {
    const result = searchInstruments("US AI infrastructure BUY candidates");

    expect(result.relatedScreenCandidates).toEqual([]);
  });

  it("does not mark non-BUY signal screens as strong AI infrastructure evidence", () => {
    const result = searchInstruments("US AI infrastructure SELL candidates");

    expect(result.primaryCandidates[0].screeningEvidence).toMatchObject({
      quality: "weak",
      weaknessReason: "Matched by structured criteria without enough cited source material.",
    });
  });
});
