import { describe, expect, it } from "vitest";
import { searchInstruments } from "../src/modules/instrument-search";
import { assembleSearchResultCards } from "../src/modules/search-result-assembler";
import { renderDashboardSummary } from "../src/modules/dashboard-summary";

describe("ProfessionalWorkspace dashboard", () => {
  it("renders two equal search modes with lookup-first results", () => {
    const result = searchInstruments("삼성");
    const html = renderDashboardSummary({
      query: "삼성",
      searchResult: result,
      searchCards: assembleSearchResultCards(result),
    });

    expect(html).toContain("Stock Lookup");
    expect(html).toContain("Investment Idea Screen");
    expect(html).toContain("search-command");
    expect(html).toContain("candidate-grid");
    expect(html).toContain("Lookup-first results");
    expect(html).toContain("Related Investment Idea Screens");
    expect(html).toContain("Samsung Electronics");
    expect(html).toContain("Samsung C&amp;T");
  });

  it("renders no-match guidance instead of fabricated cards when portfolio data is unavailable", () => {
    const result = searchInstruments("내 포트폴리오에서 손절 가까운 종목", { portfolioAvailable: false });
    const html = renderDashboardSummary({
      query: "내 포트폴리오에서 손절 가까운 종목",
      searchResult: result,
      searchCards: assembleSearchResultCards(result),
    });

    expect(html).toContain("No instruments matched");
    expect(html).toContain("Portfolio unavailable; portfolio conditions were not included in ranking.");
    expect(html).not.toContain("Open research detail");
  });

  it("renders related Investment Idea Screen candidates alongside lookup-first results", () => {
    const result = searchInstruments("삼성");
    const html = renderDashboardSummary({
      query: "삼성",
      searchResult: result,
      searchCards: assembleSearchResultCards(result),
    });

    expect(html).toContain("related-screen-candidates");
    expect(html).toContain("Samsung Electronics (KR:XKRX:005930)");
  });

  it("renders Screening Evidence, ranking, and decision-support context", () => {
    const result = searchInstruments("US AI infrastructure BUY candidates");
    const html = renderDashboardSummary({
      query: "US AI infrastructure BUY candidates",
      searchResult: result,
      searchCards: assembleSearchResultCards(result),
    });

    expect(html).toContain("Screening Evidence: strong");
    expect(html).toContain("Search Intent fit: 1");
    expect(html).toContain("Decision-support only");
    expect(html).toContain("Confidence 88%");
    expect(html).toContain("AI Weight Haircut: 6%");
    expect(html).toContain("action-badge action-buy");
  });

  it("renders structured Screening Evidence criteria and cited sources on result cards", () => {
    const result = searchInstruments("US AI infrastructure BUY candidates");
    const html = renderDashboardSummary({
      query: "US AI infrastructure BUY candidates",
      searchResult: result,
      searchCards: assembleSearchResultCards(result),
    });

    expect(html).toContain("Criteria: theme:ai_infrastructure, action:BUY, market:US");
    expect(html).toContain("Source: AI infrastructure demand update");
    expect(html).toContain("https://example.com/ai-infrastructure-demand");
  });
});
