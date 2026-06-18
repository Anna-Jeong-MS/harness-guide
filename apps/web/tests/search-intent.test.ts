import { describe, expect, it } from "vitest";
import { describeSearchIntent, parseSearchIntent } from "../src/modules/search-intent";

describe("Search Intent", () => {
  it("parses Stock Lookup intent for company and ticker queries", () => {
    expect(parseSearchIntent("삼성전자")).toMatchObject({
      rawQuery: "삼성전자",
      primaryMode: "stock_lookup",
      modes: ["stock_lookup"],
      filters: ["company"],
    });

    expect(parseSearchIntent("AAPL")).toMatchObject({
      primaryMode: "stock_lookup",
      modes: ["stock_lookup"],
      filters: ["ticker"],
    });
  });

  it("parses Investment Idea Screen intent for thematic prompts", () => {
    const intent = parseSearchIntent("US AI infrastructure BUY candidates");

    expect(intent).toMatchObject({
      primaryMode: "investment_idea_screen",
      modes: ["investment_idea_screen"],
      market: "US",
    });
    expect(intent.filters).toEqual(["market", "theme", "signal_state"]);
    expect(intent.themes).toEqual(["ai_infrastructure"]);
    expect(intent.actionLabels).toEqual(["BUY"]);
  });

  it("uses lookup-first ambiguity for short company-family queries", () => {
    const intent = parseSearchIntent("삼성");

    expect(intent.primaryMode).toBe("stock_lookup");
    expect(intent.modes).toEqual(["stock_lookup", "investment_idea_screen"]);
    expect(intent.ambiguity).toEqual("lookup_first");
  });

  it("keeps portfolio searches runnable when portfolio context is unavailable", () => {
    const intent = parseSearchIntent("내 포트폴리오에서 손절 가까운 종목");

    expect(intent.primaryMode).toBe("investment_idea_screen");
    expect(intent.filters).toContain("portfolio_risk");
    expect(intent.portfolioScope).toBe("selected_portfolio");
  });

  it("describes the visible interpretation shown to the user", () => {
    const description = describeSearchIntent(parseSearchIntent("US AI infrastructure BUY candidates"));

    expect(description).toEqual([
      "Mode: Investment Idea Screen",
      "Market: US",
      "Themes: ai_infrastructure",
      "Action Labels: BUY",
    ]);
  });
});
