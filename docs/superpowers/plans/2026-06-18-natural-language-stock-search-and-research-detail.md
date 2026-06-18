# Natural Language Stock Search and Research Detail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a two-mode natural language search experience and a Recharts-based professional research detail page for Korean and US equities.

**Architecture:** Add a deterministic Search Intent seam that supports equal Stock Lookup and Investment Idea Screen modes. Assemble ranked search cards with Screening Evidence, then render a signal detail page with a fixed Signal Brief and Trade Timing summary plus tabbed Research Report Panels. Use Recharts from the start, but keep chart components fed by typed view models so signal calculation and visualization stay separate.

**Tech Stack:** Next.js 15, React 19, TypeScript 5.6, Vitest 2.1, Recharts, semantic CSS in `app/globals.css`, existing HTML-string rendering helpers, existing domain types in `apps/web/src/domain/`.

## Global Constraints

- Use canonical terms from `CONTEXT.md`: Investment Professional, Research Note, Client Report, Research Report Panel, Trade Timing Plan, Strategy Profile, Market Data Provider, Provisional Signal, Confirmed Signal, Strategy Backtest, Workspace, Professional Research Terminal, Portfolio, Alert Event, Action Label, InstrumentId, Stock Lookup, Investment Idea Screen, Screening Evidence, Search Intent, Result Ranking Policy, Broker Connection, AI Weight Haircut, Audit Log.
- The MVP supports Korean and US equities.
- The trading horizon is swing trading over days to weeks.
- The product is a professional decision-support system, not an automatic investment adviser or auto-trading system.
- Broker Connections are read-only and must not place, modify, or cancel orders.
- Stock Lookup and Investment Idea Screen are equal search modes.
- Ambiguous short queries use lookup-first behavior: show Stock Lookup results first and related Investment Idea Screen interpretations alongside them.
- Investment Idea Screen matches require Screening Evidence: structured criteria plus cited EvidenceSource material; tag-only matches are weak evidence.
- The MVP uses a deterministic rules-based Search Intent parser behind a stable Search Intent contract.
- Result Ranking Policy order is Search Intent fit, Confirmed Signal confidence, Screening Evidence quality, portfolio relevance, then risk penalties.
- Compact dashboard surfaces and the Signal Brief may use strong BUY, HOLD, and SELL Action Labels only with decision-support copy, Review Required conditions, and conflicting or risk evidence.
- If Portfolio data is unavailable, search still runs, Portfolio Impact Report Panel is unavailable, and portfolio conditions are marked as excluded from ranking.
- Client Reports can be drafted only from approved Research Notes and portfolio context.
- The UX must use a dark Professional Research Terminal tone: dense, calm, precise, and closer to professional market software than generic SaaS.
- Use `apps/web/app/globals.css` and semantic classes for this slice; do not introduce Tailwind in this plan.
- Dashboard layout is a top search command area followed by a responsive candidate card grid.
- Detail layout starts with an executive command bar, then Trade Timing Plan and primary chart, then tabbed Research Report Panels.
- Mobile is first-class: sticky compact detail summary, horizontal segmented panel tabs, touch-sized controls, and horizontally scrollable chart panels when needed.
- Action Label badges use low-saturation semantic colors with borders: BUY muted green, HOLD amber or neutral, SELL muted red, REVIEW_REQUIRED violet or gray.
- Use shared formatting helpers so confidence and AI contribution render as percentages, price levels render as localized numbers without forced currency symbols, and risk renders as Low, Moderate, or High with numeric support.

---

## File Structure

- Modify: `apps/web/package.json`
  - Adds the Recharts dependency.
- Create: `apps/web/app/globals.css`
  - Defines the Professional Research Terminal visual system, semantic classes, responsive grid, mobile sticky summary, segmented tabs, and Action Label badges.
- Modify: `apps/web/app/layout.tsx`
  - Imports `globals.css` and sets product metadata.
- Create: `apps/web/src/modules/formatters.ts`
  - Owns shared percentage, price level, range, and risk formatting.
- Create: `apps/web/tests/formatters.test.ts`
  - Tests numerical formatting used by dashboard and detail renderers.
- Create: `apps/web/src/modules/search-intent.ts`
  - Owns `SearchIntent`, `SearchMode`, parser output, ambiguity, and no-match guidance.
- Create: `apps/web/src/modules/instrument-search.ts`
  - Owns deterministic instrument catalog, Stock Lookup, Investment Idea Screen candidate resolution, Screening Evidence, and lookup-first merge behavior.
- Create: `apps/web/src/modules/search-result-assembler.ts`
  - Owns Search Result cards and the Result Ranking Policy.
- Create: `apps/web/src/modules/research-detail.ts`
  - Owns the report-grade detail view model and HTML shell for fixed summary plus tabbed Research Report Panels.
- Create: `apps/web/src/modules/research-charts.tsx`
  - Owns Recharts React components for price/volume, indicators, contribution, risk, backtest, and portfolio exposure.
- Create: `apps/web/src/modules/research-chart-models.ts`
  - Owns chart-ready view models and unavailable states.
- Create: `apps/web/tests/search-intent.test.ts`
  - Tests mode parsing, lookup-first ambiguity, and no-match guidance.
- Create: `apps/web/tests/instrument-search.test.ts`
  - Tests Stock Lookup, Investment Idea Screen, Screening Evidence, and portfolio-unavailable behavior.
- Create: `apps/web/tests/search-result-assembler.test.ts`
  - Tests Result Ranking Policy and search cards.
- Create: `apps/web/tests/research-detail.test.ts`
  - Tests fixed summary, Research Report Panels, decision-support copy, and unavailable states.
- Create: `apps/web/tests/research-chart-models.test.ts`
  - Tests chart-ready data and unavailable states.
- Create: `apps/web/tests/research-charts.test.tsx`
  - Tests Recharts components render accessible panel labels from view models.
- Modify: `apps/web/src/modules/dashboard-summary.ts`
  - Renders the two-mode search surface, interpreted Search Intent, lookup-first results, and related screen interpretations.
- Modify: `apps/web/tests/dashboard.test.ts`
  - Tests the dashboard integration.
- Modify: `apps/web/app/page.tsx`
  - Reads `searchParams.q`, builds Search Intent and results, and renders dashboard HTML.
- Modify: `apps/web/app/signals/[instrumentId]/page.tsx`
  - Renders the full professional research detail page.

---

### Task 1: Add Recharts and Professional Research Terminal foundation

**Files:**
- Modify: `apps/web/package.json`
- Modify: `package-lock.json`
- Create: `apps/web/app/globals.css`
- Modify: `apps/web/app/layout.tsx`
- Create: `apps/web/src/modules/formatters.ts`
- Create: `apps/web/tests/formatters.test.ts`

**Interfaces:**
- Produces: installed `recharts` package for `apps/web/src/modules/research-charts.tsx`.
- Produces:
  - `function formatPercent(value: number): string`
  - `function formatPrice(value: number): string`
  - `function formatPriceRange(range: { low: number; high: number }): string`
  - `function formatRisk(value: number): { label: "Low" | "Moderate" | "High"; display: string }`
- Produces: global semantic CSS classes used by later dashboard and detail renderers.

- [ ] **Step 1: Add Recharts with npm**

Run:

```bash
npm --prefix apps/web install recharts
```

Expected: `apps/web/package.json` includes `"recharts"` in `dependencies`, and `package-lock.json` is updated.

- [ ] **Step 2: Write failing formatter tests**

Create `apps/web/tests/formatters.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { formatPercent, formatPrice, formatPriceRange, formatRisk } from "../src/modules/formatters";

describe("professional numeric formatters", () => {
  it("formats confidence and AI contribution as percentages", () => {
    expect(formatPercent(0.82)).toBe("82%");
    expect(formatPercent(0.405)).toBe("41%");
  });

  it("formats price levels as localized numbers without forced currency symbols", () => {
    expect(formatPrice(118)).toBe("118");
    expect(formatPrice(71000)).toBe("71,000");
    expect(formatPriceRange({ low: 118, high: 124 })).toBe("118 - 124");
  });

  it("formats risk with professional labels and numeric support", () => {
    expect(formatRisk(0.2)).toEqual({ label: "Low", display: "Low (20%)" });
    expect(formatRisk(0.5)).toEqual({ label: "Moderate", display: "Moderate (50%)" });
    expect(formatRisk(0.8)).toEqual({ label: "High", display: "High (80%)" });
  });
});
```

- [ ] **Step 3: Run formatter tests to verify they fail**

Run:

```bash
npm --prefix apps/web test -- --run tests/formatters.test.ts
```

Expected: FAIL with a module resolution error for `../src/modules/formatters`.

- [ ] **Step 4: Implement formatters**

Create `apps/web/src/modules/formatters.ts`:

```typescript
export function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function formatPrice(value: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: value >= 1000 ? 0 : 2,
  }).format(value);
}

export function formatPriceRange(range: { low: number; high: number }): string {
  return `${formatPrice(range.low)} - ${formatPrice(range.high)}`;
}

export function formatRisk(value: number): { label: "Low" | "Moderate" | "High"; display: string } {
  const label = value < 0.34 ? "Low" : value < 0.67 ? "Moderate" : "High";
  return {
    label,
    display: `${label} (${formatPercent(value)})`,
  };
}
```

- [ ] **Step 5: Add the Professional Research Terminal CSS**

Create `apps/web/app/globals.css`:

```css
:root {
  color-scheme: dark;
  --surface-0: #070a0f;
  --surface-1: #0d121a;
  --surface-2: #131b26;
  --surface-3: #1c2633;
  --text-0: #f4f7fb;
  --text-1: #c8d2df;
  --text-2: #7f8da1;
  --line: rgba(148, 163, 184, 0.22);
  --accent: #7dd3fc;
  --buy: #62d394;
  --hold: #e4b557;
  --sell: #ef7878;
  --review: #a78bfa;
  --shadow: 0 24px 80px rgba(0, 0, 0, 0.45);
}

* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  min-height: 100%;
  background:
    radial-gradient(circle at top left, rgba(125, 211, 252, 0.14), transparent 34rem),
    linear-gradient(135deg, var(--surface-0), #0a0f17 52%, #05070b);
  color: var(--text-0);
  font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

a {
  color: inherit;
}

.workspace-shell,
.research-detail {
  width: min(1440px, calc(100vw - 32px));
  margin: 0 auto;
  padding: 32px 0 56px;
}

.terminal-header,
.search-command,
.fixed-summary,
.report-tabs,
.search-result-card,
.report-panel {
  border: 1px solid var(--line);
  background: linear-gradient(180deg, rgba(19, 27, 38, 0.94), rgba(13, 18, 26, 0.94));
  box-shadow: var(--shadow);
  backdrop-filter: blur(18px);
}

.terminal-header,
.search-command,
.fixed-summary {
  border-radius: 28px;
  padding: 24px;
}

.candidate-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
  margin-top: 20px;
}

.search-result-card,
.report-panel {
  border-radius: 22px;
  padding: 18px;
}

.command-bar {
  position: sticky;
  top: 0;
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  border-bottom: 1px solid var(--line);
  background: rgba(7, 10, 15, 0.86);
  padding: 12px 0;
  backdrop-filter: blur(16px);
}

.action-badge {
  display: inline-flex;
  align-items: center;
  border: 1px solid currentColor;
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.action-buy {
  color: var(--buy);
  background: rgba(98, 211, 148, 0.1);
}

.action-hold {
  color: var(--hold);
  background: rgba(228, 181, 87, 0.1);
}

.action-sell {
  color: var(--sell);
  background: rgba(239, 120, 120, 0.1);
}

.action-review {
  color: var(--review);
  background: rgba(167, 139, 250, 0.1);
}

.mode-chips,
.segmented-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.mode-chip,
.tab-chip,
.quality-state {
  border: 1px solid var(--line);
  border-radius: 999px;
  color: var(--text-1);
  padding: 7px 11px;
}

.chart-scroll {
  overflow-x: auto;
  padding-bottom: 8px;
}

@media (max-width: 720px) {
  .workspace-shell,
  .research-detail {
    width: min(100vw - 20px, 720px);
    padding: 16px 0 32px;
  }

  .terminal-header,
  .search-command,
  .fixed-summary {
    border-radius: 20px;
    padding: 18px;
  }

  .command-bar {
    align-items: flex-start;
    flex-direction: column;
  }

  .candidate-grid {
    grid-template-columns: 1fr;
  }

  .segmented-tabs {
    flex-wrap: nowrap;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .tab-chip {
    min-height: 44px;
    white-space: nowrap;
  }
}
```

- [ ] **Step 6: Import global CSS in the root layout**

Replace `apps/web/app/layout.tsx` with:

```tsx
import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Professional Stock Signal Workspace",
  description: "Professional Research Terminal for stock signal review.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 7: Verify responsive UX classes exist**

Run:

```bash
rg "@media \\(max-width: 720px\\)|candidate-grid|command-bar|segmented-tabs|action-badge" apps/web/app/globals.css
```

Expected: output includes all five patterns, proving the Professional Research Terminal, responsive grid, mobile segmented tabs, command bar, and Action Label badge styles are present.

- [ ] **Step 8: Run formatter tests and current web tests**

Run:

```bash
npm --prefix apps/web test -- --run tests/formatters.test.ts
npm --prefix apps/web test -- --run
```

Expected: PASS. If existing tests fail before feature work, stop and report the baseline failure.

- [ ] **Step 9: Commit**

```bash
git add apps/web/package.json package-lock.json apps/web/app/globals.css apps/web/app/layout.tsx apps/web/src/modules/formatters.ts apps/web/tests/formatters.test.ts
git commit -m "feat: add professional research terminal foundation"
```

---

### Task 2: Search Intent parser

**Files:**
- Create: `apps/web/src/modules/search-intent.ts`
- Create: `apps/web/tests/search-intent.test.ts`

**Interfaces:**
- Produces:
  - `type SearchMode = "stock_lookup" | "investment_idea_screen"`
  - `type SearchIntentFilter = "company" | "ticker" | "market" | "sector" | "theme" | "signal_state" | "risk" | "portfolio_risk"`
  - `type SearchIntent`
  - `function parseSearchIntent(query: string): SearchIntent`
  - `function describeSearchIntent(intent: SearchIntent): string[]`

- [ ] **Step 1: Write the failing tests**

Create `apps/web/tests/search-intent.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run:

```bash
npm --prefix apps/web test -- --run tests/search-intent.test.ts
```

Expected: FAIL with a module resolution error for `../src/modules/search-intent`.

- [ ] **Step 3: Implement the Search Intent parser**

Create `apps/web/src/modules/search-intent.ts`:

```typescript
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

const knownCompanyTerms = ["삼성전자", "삼성", "samsung", "apple", "aapl", "nvidia", "nvda"];

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

  if (/\b(us|미국|nasdaq|nyse)\b/.test(normalizedQuery)) {
    market = "US";
    filters.add("market");
    modes.add("investment_idea_screen");
  }

  if (/\b(kr|korea|한국|국내|코스피|코스닥)\b/.test(normalizedQuery)) {
    market = "KR";
    filters.add("market");
    modes.add("investment_idea_screen");
  }

  if (/\b(ai|infrastructure|인공지능|인프라)\b/.test(normalizedQuery)) {
    themes.add("ai_infrastructure");
    filters.add("theme");
    modes.add("investment_idea_screen");
  }

  if (/\b(dividend|배당)\b/.test(normalizedQuery)) {
    themes.add("dividend_stability");
    filters.add("theme");
    modes.add("investment_idea_screen");
  }

  if (/\b(semiconductor|반도체)\b/.test(normalizedQuery)) {
    sectors.add("semiconductors");
    filters.add("sector");
    modes.add("investment_idea_screen");
  }

  if (/\b(buy|매수)\b/.test(normalizedQuery)) {
    actionLabels.add("BUY");
    filters.add("signal_state");
    modes.add("investment_idea_screen");
  }

  if (/\b(hold|보유|관망)\b/.test(normalizedQuery)) {
    actionLabels.add("HOLD");
    filters.add("signal_state");
    modes.add("investment_idea_screen");
  }

  if (/\b(sell|매도)\b/.test(normalizedQuery)) {
    actionLabels.add("SELL");
    filters.add("signal_state");
    modes.add("investment_idea_screen");
  }

  if (/\b(portfolio|holding|holdings|포트폴리오|보유|손절|리스크|risk)\b/.test(normalizedQuery)) {
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run:

```bash
npm --prefix apps/web test -- --run tests/search-intent.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/modules/search-intent.ts apps/web/tests/search-intent.test.ts
git commit -m "feat: parse stock search intent"
```

---

### Task 3: Instrument search and Screening Evidence

**Files:**
- Create: `apps/web/src/modules/instrument-search.ts`
- Create: `apps/web/tests/instrument-search.test.ts`

**Interfaces:**
- Consumes:
  - `parseSearchIntent(query: string): SearchIntent`
- Produces:
  - `type ScreeningEvidence`
  - `type InstrumentSearchCandidate`
  - `type InstrumentSearchResult`
  - `function searchInstruments(query: string, options?: { portfolioAvailable?: boolean }): InstrumentSearchResult`

- [ ] **Step 1: Write the failing tests**

Create `apps/web/tests/instrument-search.test.ts`:

```typescript
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
    expect(result.primaryCandidates.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run:

```bash
npm --prefix apps/web test -- --run tests/instrument-search.test.ts
```

Expected: FAIL with a module resolution error for `../src/modules/instrument-search`.

- [ ] **Step 3: Implement instrument search**

Create `apps/web/src/modules/instrument-search.ts`:

```typescript
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
  const relatedScreenCandidates = uniqueCandidates(
    allCandidates.filter((candidate) => candidate.primaryMode === "investment_idea_screen"),
  );

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
    if (item.aliases.some((alias) => intent.normalizedQuery.includes(alias.toLowerCase()))) {
      reasons.add("company_alias_match");
    }
  }
  if (mode === "investment_idea_screen") {
    if (intent.themes.some((theme) => item.themes.includes(theme))) {
      reasons.add("theme_match");
    }
    if (intent.sectors.some((sector) => item.sectors.includes(sector))) {
      reasons.add("theme_match");
    }
    if (intent.actionLabels.length > 0 && item.themes.includes("ai_infrastructure")) {
      reasons.add("signal_filter_match");
    }
    if (intent.portfolioScope && portfolioAvailable && item.instrumentId === "KR:XKRX:005930") {
      reasons.add("portfolio_risk_match");
    }
    if (intent.portfolioScope && !portfolioAvailable && item.instrumentId === "KR:XKRX:005930") {
      reasons.add("theme_match");
    }
  }
  return Array.from(reasons);
}

function buildScreeningEvidence(
  item: InstrumentCatalogEntry,
  intent: SearchIntent,
): ScreeningEvidence {
  const structuredCriteria = [
    ...intent.themes.map((theme) => `theme:${theme}`),
    ...intent.actionLabels.map((label) => `action:${label}`),
    ...(intent.market ? [`market:${intent.market}`] : []),
  ];
  const strong = item.instrumentId === "US:XNAS:NVDA" && intent.themes.includes("ai_infrastructure");
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run:

```bash
npm --prefix apps/web test -- --run tests/instrument-search.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/modules/instrument-search.ts apps/web/tests/instrument-search.test.ts
git commit -m "feat: search instruments with screening evidence"
```

---

### Task 4: Search result cards and dashboard

**Files:**
- Create: `apps/web/src/modules/search-result-assembler.ts`
- Create: `apps/web/tests/search-result-assembler.test.ts`
- Modify: `apps/web/src/modules/dashboard-summary.ts`
- Modify: `apps/web/tests/dashboard.test.ts`
- Modify: `apps/web/app/page.tsx`

**Interfaces:**
- Consumes:
  - `searchInstruments(query: string, options?: { portfolioAvailable?: boolean }): InstrumentSearchResult`
  - `describeSearchIntent(intent: SearchIntent): string[]`
- Produces:
  - `type SearchResultCard`
  - `function assembleSearchResultCards(result: InstrumentSearchResult): SearchResultCard[]`
  - `function renderDashboardSummary(input: DashboardSummaryInput): string`

- [ ] **Step 1: Write failing search result tests**

Create `apps/web/tests/search-result-assembler.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { searchInstruments } from "../src/modules/instrument-search";
import { assembleSearchResultCards } from "../src/modules/search-result-assembler";

describe("Search Result Assembler", () => {
  it("applies Result Ranking Policy with Search Intent fit first", () => {
    const cards = assembleSearchResultCards(searchInstruments("US AI infrastructure BUY candidates"));

    expect(cards[0]).toMatchObject({
      instrumentId: "US:XNAS:NVDA",
      displayName: "NVIDIA",
      primaryMode: "investment_idea_screen",
      actionLabel: "BUY",
      confidence: 0.88,
      screeningEvidenceQuality: "strong",
    });
    expect(cards[0].rankingBreakdown).toEqual([
      "Search Intent fit: 1",
      "Confirmed Signal confidence: 0.88",
      "Screening Evidence quality: 1",
      "Portfolio relevance: 0",
      "Risk penalty: -0.2",
    ]);
  });

  it("shows portfolio unavailable state without silently applying portfolio ranking", () => {
    const cards = assembleSearchResultCards(
      searchInstruments("내 포트폴리오에서 손절 가까운 종목", { portfolioAvailable: false }),
    );

    expect(cards[0].portfolioStateMessage).toBe(
      "Portfolio unavailable; portfolio conditions were not included in ranking.",
    );
  });
});
```

- [ ] **Step 2: Write failing dashboard tests**

Replace `apps/web/tests/dashboard.test.ts` with:

```typescript
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
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run:

```bash
npm --prefix apps/web test -- --run tests/search-result-assembler.test.ts tests/dashboard.test.ts
```

Expected: FAIL with missing `search-result-assembler` and dashboard signature errors.

- [ ] **Step 4: Implement search result assembly**

Create `apps/web/src/modules/search-result-assembler.ts`:

```typescript
import type { DataFinality, InstrumentId, QualityFlag } from "../domain/market";
import type { PortfolioActionLabel } from "../domain/portfolio";
import type { ActionLabel, TradeTimingPlan } from "../domain/signals";
import type { InstrumentSearchResult } from "./instrument-search";
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
  qualityFlags: QualityFlag[];
  rankingBreakdown: string[];
  portfolioStateMessage?: string;
  detailHref: string;
};

const signals: Record<InstrumentId, Omit<SearchResultCard, "displayName" | "primaryMode" | "screeningEvidenceQuality" | "qualityFlags" | "rankingBreakdown" | "portfolioStateMessage" | "detailHref">> = {
  "KR:XKRX:005930": signal("KR:XKRX:005930", "HOLD", 0.64, { low: 71000, high: 73500 }, 67500, { low: 79000, high: 82500 }, 0.21, 0.08, "REVIEW_REQUIRED"),
  "KR:XKRX:000830": signal("KR:XKRX:000830", "HOLD", 0.57, { low: 154000, high: 159000 }, 148000, { low: 171000, high: 178000 }, 0.18, 0, "HOLD_AND_MONITOR"),
  "US:XNAS:AAPL": signal("US:XNAS:AAPL", "BUY", 0.82, { low: 198, high: 204 }, 188, { low: 224, high: 232 }, 0.4, 0, "NEW_BUY_CANDIDATE"),
  "US:XNAS:NVDA": signal("US:XNAS:NVDA", "BUY", 0.88, { low: 118, high: 124 }, 109, { low: 138, high: 146 }, 0.42, 0.06, "ADD_ON_CANDIDATE"),
};

export function assembleSearchResultCards(result: InstrumentSearchResult): SearchResultCard[] {
  return result.primaryCandidates
    .map((candidate) => {
      const signalFixture = signals[candidate.instrumentId];
      const screeningEvidenceQuality = candidate.screeningEvidence?.quality;
      return {
        ...signalFixture,
        displayName: candidate.displayName,
        primaryMode: candidate.primaryMode,
        ...(screeningEvidenceQuality ? { screeningEvidenceQuality } : {}),
        qualityFlags: candidate.qualityFlags,
        rankingBreakdown: rankingBreakdown(signalFixture.confidence, screeningEvidenceQuality, candidate.qualityFlags),
        ...(!result.portfolioState.available && result.portfolioState.message
          ? { portfolioStateMessage: result.portfolioState.message }
          : {}),
        detailHref: `/signals/${encodeURIComponent(candidate.instrumentId)}`,
      };
    })
    .sort((left, right) => rank(right) - rank(left));
}

function rankingBreakdown(
  confidence: number,
  screeningEvidenceQuality: "strong" | "weak" | undefined,
  qualityFlags: QualityFlag[],
): string[] {
  return [
    "Search Intent fit: 1",
    `Confirmed Signal confidence: ${confidence}`,
    `Screening Evidence quality: ${screeningEvidenceQuality === "strong" ? 1 : screeningEvidenceQuality === "weak" ? 0.35 : 0}`,
    "Portfolio relevance: 0",
    `Risk penalty: ${qualityFlags.includes("high_volatility") ? -0.2 : 0}`,
  ];
}

function rank(card: SearchResultCard): number {
  const evidence = card.screeningEvidenceQuality === "strong" ? 1 : card.screeningEvidenceQuality === "weak" ? 0.35 : 0;
  const riskPenalty = card.qualityFlags.includes("high_volatility") ? -0.2 : 0;
  return 1 * 10 + card.confidence + evidence + riskPenalty;
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
) {
  return {
    instrumentId,
    actionLabel,
    confidence,
    finality: "confirmed" as const,
    tradeTimingPlan: {
      actionLabel,
      entryZone,
      stopLevel,
      targetZone,
      timeHorizon: "days_to_weeks" as const,
    },
    aiContribution,
    aiWeightHaircut,
    portfolioAction,
  };
}
```

- [ ] **Step 5: Implement dashboard rendering**

Replace `apps/web/src/modules/dashboard-summary.ts` with:

```typescript
import { describeSearchIntent } from "./search-intent";
import type { InstrumentSearchResult } from "./instrument-search";
import type { SearchResultCard } from "./search-result-assembler";
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
    result.portfolioState.message ? `<p>${escapeHtml(result.portfolioState.message)}</p>` : "",
    "</section>",
  ].join("");
}

function renderCards(result: InstrumentSearchResult, cards: SearchResultCard[]): string {
  if (result.noMatch) {
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
    `<p>AI contribution: ${formatPercent(card.aiContribution)} · AI Weight Haircut: ${formatPercent(card.aiWeightHaircut)}</p>`,
    ...card.rankingBreakdown.map((line) => `<p>${escapeHtml(line)}</p>`),
    card.portfolioStateMessage ? `<p>${escapeHtml(card.portfolioStateMessage)}</p>` : "",
    `<a href="${escapeHtml(card.detailHref)}">Open research detail</a>`,
    "</article>",
  ].join("");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
```

- [ ] **Step 6: Wire the dashboard page**

Replace `apps/web/app/page.tsx` with:

```typescript
import { renderDashboardSummary } from "../src/modules/dashboard-summary";
import { searchInstruments } from "../src/modules/instrument-search";
import { assembleSearchResultCards } from "../src/modules/search-result-assembler";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() || "US AI infrastructure BUY candidates";
  const searchResult = searchInstruments(query);
  const html = renderDashboardSummary({
    query,
    searchResult,
    searchCards: assembleSearchResultCards(searchResult),
  });

  return <main dangerouslySetInnerHTML={{ __html: html }} />;
}
```

- [ ] **Step 7: Run tests to verify they pass**

Run:

```bash
npm --prefix apps/web test -- --run tests/search-result-assembler.test.ts tests/dashboard.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/modules/search-result-assembler.ts apps/web/src/modules/dashboard-summary.ts apps/web/tests/search-result-assembler.test.ts apps/web/tests/dashboard.test.ts apps/web/app/page.tsx
git commit -m "feat: render two-mode search dashboard"
```

---

### Task 5: Chart-ready research models

**Files:**
- Create: `apps/web/src/modules/research-chart-models.ts`
- Create: `apps/web/tests/research-chart-models.test.ts`

**Interfaces:**
- Produces:
  - `type ChartPanel<T>`
  - `type ResearchChartSuite`
  - `function buildResearchChartSuite(instrumentId: InstrumentId): ResearchChartSuite`

- [ ] **Step 1: Write the failing tests**

Create `apps/web/tests/research-chart-models.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { buildResearchChartSuite } from "../src/modules/research-chart-models";

describe("research chart models", () => {
  it("builds chart-ready models for a complete signal detail", () => {
    const suite = buildResearchChartSuite("US:XNAS:NVDA");

    expect(suite.priceVolume.state).toBe("available");
    expect(suite.priceVolume.data?.entryZone).toEqual({ low: 118, high: 124 });
    expect(suite.indicators.data?.rsi).toBe(61);
    expect(suite.contribution.data?.segments).toEqual([
      { label: "Rules and factors", value: 0.52 },
      { label: "AI context", value: 0.42 },
      { label: "AI Weight Haircut", value: -0.06 },
    ]);
    expect(suite.risk.data?.metrics.map((metric) => metric.label)).toContain("AI uncertainty");
    expect(suite.backtest.data?.maxDrawdown).toBe(0.18);
    expect(suite.portfolioExposure.data?.weights).toContainEqual({
      label: "Semiconductors",
      value: 0.34,
    });
  });

  it("returns explicit unavailable states when a panel lacks enough data", () => {
    const suite = buildResearchChartSuite("KR:XKRX:000830");

    expect(suite.backtest).toEqual({
      state: "unavailable",
      reason: "Insufficient backtest sample for this instrument.",
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npm --prefix apps/web test -- --run tests/research-chart-models.test.ts
```

Expected: FAIL with a missing `research-chart-models` module.

- [ ] **Step 3: Implement chart-ready models**

Create `apps/web/src/modules/research-chart-models.ts`:

```typescript
import type { InstrumentId } from "../domain/market";

export type ChartPanel<T> =
  | { state: "available"; data: T }
  | { state: "unavailable"; reason: string };

export type ResearchChartSuite = {
  priceVolume: ChartPanel<{
    points: Array<{ date: string; close: number; volume: number }>;
    entryZone: { low: number; high: number };
    stopLevel: number;
    targetZone: { low: number; high: number };
  }>;
  indicators: ChartPanel<{
    rsi: number;
    macd: number;
    movingAverage20: number;
    movingAverage60: number;
    volatility: number;
    volumeSurge: number;
  }>;
  contribution: ChartPanel<{
    finalConfidence: number;
    segments: Array<{ label: string; value: number }>;
  }>;
  risk: ChartPanel<{
    metrics: Array<{ label: string; value: number }>;
  }>;
  backtest: ChartPanel<{
    winRate: number;
    expectedValue: number;
    maxDrawdown: number;
    equityCurve: Array<{ period: string; value: number }>;
  }>;
  portfolioExposure: ChartPanel<{
    weights: Array<{ label: string; value: number }>;
  }>;
};

export function buildResearchChartSuite(instrumentId: InstrumentId): ResearchChartSuite {
  const isIncomplete = instrumentId === "KR:XKRX:000830";
  return {
    priceVolume: {
      state: "available",
      data: {
        points: [
          { date: "2026-06-14", close: 116, volume: 1200000 },
          { date: "2026-06-15", close: 119, volume: 1420000 },
          { date: "2026-06-16", close: 123, volume: 1810000 },
          { date: "2026-06-17", close: 126, volume: 1740000 },
        ],
        entryZone: isIncomplete ? { low: 154000, high: 159000 } : { low: 118, high: 124 },
        stopLevel: isIncomplete ? 148000 : 109,
        targetZone: isIncomplete ? { low: 171000, high: 178000 } : { low: 138, high: 146 },
      },
    },
    indicators: {
      state: "available",
      data: {
        rsi: isIncomplete ? 47 : 61,
        macd: 1.8,
        movingAverage20: 122,
        movingAverage60: 115,
        volatility: isIncomplete ? 0.18 : 0.24,
        volumeSurge: isIncomplete ? 1.08 : 1.42,
      },
    },
    contribution: {
      state: "available",
      data: {
        finalConfidence: isIncomplete ? 0.57 : 0.88,
        segments: [
          { label: "Rules and factors", value: isIncomplete ? 0.39 : 0.52 },
          { label: "AI context", value: isIncomplete ? 0.18 : 0.42 },
          { label: "AI Weight Haircut", value: isIncomplete ? 0 : -0.06 },
        ],
      },
    },
    risk: {
      state: "available",
      data: {
        metrics: [
          { label: "Volatility", value: isIncomplete ? 0.42 : 0.76 },
          { label: "Concentration", value: isIncomplete ? 0.37 : 0.68 },
          { label: "Liquidity", value: 0.22 },
          { label: "Event risk", value: isIncomplete ? 0.33 : 0.61 },
          { label: "Data quality", value: 0.18 },
          { label: "AI uncertainty", value: isIncomplete ? 0.29 : 0.44 },
        ],
      },
    },
    backtest: isIncomplete
      ? {
          state: "unavailable",
          reason: "Insufficient backtest sample for this instrument.",
        }
      : {
          state: "available",
          data: {
            winRate: 0.58,
            expectedValue: 0.14,
            maxDrawdown: 0.18,
            equityCurve: [
              { period: "2022", value: 1 },
              { period: "2023", value: 1.18 },
              { period: "2024", value: 1.32 },
              { period: "2025", value: 1.41 },
            ],
          },
        },
    portfolioExposure: {
      state: "available",
      data: {
        weights: [{ label: isIncomplete ? "Industrials" : "Semiconductors", value: isIncomplete ? 0.12 : 0.34 }],
      },
    },
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
npm --prefix apps/web test -- --run tests/research-chart-models.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/modules/research-chart-models.ts apps/web/tests/research-chart-models.test.ts
git commit -m "feat: add research chart models"
```

---

### Task 6: Recharts components

**Files:**
- Create: `apps/web/src/modules/research-charts.tsx`
- Create: `apps/web/tests/research-charts.test.tsx`

**Interfaces:**
- Consumes:
  - `ResearchChartSuite` from `apps/web/src/modules/research-chart-models.ts`
- Produces:
  - `function renderResearchCharts(suite: ResearchChartSuite): React.ReactElement`

- [ ] **Step 1: Write failing Recharts tests**

Create `apps/web/tests/research-charts.test.tsx`:

```typescript
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { buildResearchChartSuite } from "../src/modules/research-chart-models";
import { renderResearchCharts } from "../src/modules/research-charts";

describe("research Recharts components", () => {
  it("renders professional chart panel labels from chart-ready models", () => {
    const html = renderToStaticMarkup(renderResearchCharts(buildResearchChartSuite("US:XNAS:NVDA")));

    expect(html).toContain("Price and Volume");
    expect(html).toContain("Technical Indicators");
    expect(html).toContain("Signal Contribution");
    expect(html).toContain("Risk Profile");
    expect(html).toContain("Strategy Backtest");
    expect(html).toContain("Portfolio Exposure");
  });

  it("renders unavailable chart states visibly", () => {
    const html = renderToStaticMarkup(renderResearchCharts(buildResearchChartSuite("KR:XKRX:000830")));

    expect(html).toContain("Insufficient backtest sample for this instrument.");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npm --prefix apps/web test -- --run tests/research-charts.test.tsx
```

Expected: FAIL with a missing `research-charts` module.

- [ ] **Step 3: Implement Recharts components**

Create `apps/web/src/modules/research-charts.tsx`:

```typescript
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ReactElement } from "react";
import type { ChartPanel, ResearchChartSuite } from "./research-chart-models";

export function renderResearchCharts(suite: ResearchChartSuite): ReactElement {
  return (
    <section aria-label="Research visualizations">
      <ChartSection title="Price and Volume" panel={suite.priceVolume}>
        {(data) => (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={data.points}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="close" stroke="#2563eb" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </ChartSection>
      <ChartSection title="Technical Indicators" panel={suite.indicators}>
        {(data) => (
          <BarChart width={480} height={220} data={[data]}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="rsi" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="rsi" fill="#0f766e" />
            <Bar dataKey="volumeSurge" fill="#7c3aed" />
          </BarChart>
        )}
      </ChartSection>
      <ChartSection title="Signal Contribution" panel={suite.contribution}>
        {(data) => (
          <BarChart width={520} height={220} data={data.segments}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" fill="#1d4ed8" />
          </BarChart>
        )}
      </ChartSection>
      <ChartSection title="Risk Profile" panel={suite.risk}>
        {(data) => (
          <RadarChart width={420} height={280} data={data.metrics}>
            <PolarGrid />
            <PolarAngleAxis dataKey="label" />
            <PolarRadiusAxis />
            <Radar dataKey="value" fill="#dc2626" fillOpacity={0.4} stroke="#dc2626" />
          </RadarChart>
        )}
      </ChartSection>
      <ChartSection title="Strategy Backtest" panel={suite.backtest}>
        {(data) => (
          <LineChart width={520} height={220} data={data.equityCurve}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="period" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="value" stroke="#16a34a" />
          </LineChart>
        )}
      </ChartSection>
      <ChartSection title="Portfolio Exposure" panel={suite.portfolioExposure}>
        {(data) => (
          <BarChart width={420} height={220} data={data.weights}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" fill="#f59e0b" />
          </BarChart>
        )}
      </ChartSection>
    </section>
  );
}

function ChartSection<T>({
  title,
  panel,
  children,
}: {
  title: string;
  panel: ChartPanel<T>;
  children: (data: T) => ReactElement;
}): ReactElement {
  return (
    <section aria-label={title}>
      <h3>{title}</h3>
      {panel.state === "available" ? children(panel.data) : <p>{panel.reason}</p>}
    </section>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
npm --prefix apps/web test -- --run tests/research-charts.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/modules/research-charts.tsx apps/web/tests/research-charts.test.tsx
git commit -m "feat: render research charts with recharts"
```

---

### Task 7: Professional research detail page

**Files:**
- Create: `apps/web/src/modules/research-detail.ts`
- Create: `apps/web/tests/research-detail.test.ts`
- Modify: `apps/web/app/signals/[instrumentId]/page.tsx`

**Interfaces:**
- Consumes:
  - `buildResearchChartSuite(instrumentId: InstrumentId): ResearchChartSuite`
- Produces:
  - `type ResearchDetailViewModel`
  - `function buildResearchDetail(instrumentId: InstrumentId, options?: { portfolioAvailable?: boolean }): ResearchDetailViewModel`
  - `function renderResearchDetailPage(detail: ResearchDetailViewModel): string`

- [ ] **Step 1: Write failing detail tests**

Create `apps/web/tests/research-detail.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { buildResearchDetail, renderResearchDetailPage } from "../src/modules/research-detail";

describe("Research Detail", () => {
  it("renders fixed summary and tabbed Research Report Panels", () => {
    const html = renderResearchDetailPage(buildResearchDetail("US:XNAS:NVDA"));

    expect(html).toContain("Signal Brief");
    expect(html).toContain("Trade Timing");
    expect(html).toContain("command-bar");
    expect(html).toContain("fixed-summary");
    expect(html).toContain("Report tabs");
    expect(html).toContain("segmented-tabs");
    expect(html).toContain("Evidence Panel");
    expect(html).toContain("Technical Report Panel");
    expect(html).toContain("AI Context Report Panel");
    expect(html).toContain("Portfolio Impact Report Panel");
    expect(html).toContain("Backtest Report Panel");
    expect(html).toContain("Risk Report Panel");
    expect(html).toContain("Audit Panel");
    expect(html).toContain("Research and Report Actions Panel");
  });

  it("pairs strong Action Labels with decision-support copy and risk evidence", () => {
    const html = renderResearchDetailPage(buildResearchDetail("US:XNAS:NVDA"));

    expect(html).toContain("BUY");
    expect(html).toContain("action-badge action-buy");
    expect(html).toContain("Confidence 88%");
    expect(html).toContain("Entry Zone: 118 - 124");
    expect(html).toContain("Decision-support only");
    expect(html).toContain("Review Required conditions");
    expect(html).toContain("High volatility requires disciplined entry and stop monitoring.");
  });

  it("marks Portfolio Impact unavailable without making portfolio claims", () => {
    const html = renderResearchDetailPage(buildResearchDetail("US:XNAS:NVDA", { portfolioAvailable: false }));

    expect(html).toContain("Portfolio Impact Report Panel");
    expect(html).toContain("Portfolio unavailable; portfolio-specific claims are not shown.");
  });

  it("shows insufficient backtest sample as review-required", () => {
    const html = renderResearchDetailPage(buildResearchDetail("KR:XKRX:000830"));

    expect(html).toContain("Insufficient backtest sample for this instrument.");
    expect(html).toContain("Review required before interpreting performance support.");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npm --prefix apps/web test -- --run tests/research-detail.test.ts
```

Expected: FAIL with a missing `research-detail` module.

- [ ] **Step 3: Implement research detail view model and renderer**

Create `apps/web/src/modules/research-detail.ts`:

```typescript
import type { InstrumentId, QualityFlag } from "../domain/market";
import type { ActionLabel, EvidenceSource, TradeTimingPlan } from "../domain/signals";
import { formatPercent, formatPrice, formatPriceRange } from "./formatters";
import { buildResearchChartSuite, type ResearchChartSuite } from "./research-chart-models";

export type ResearchDetailViewModel = {
  instrumentId: InstrumentId;
  displayName: string;
  actionLabel: ActionLabel;
  confidence: number;
  finality: "provisional" | "confirmed";
  tradeTimingPlan: TradeTimingPlan;
  aiContribution: number;
  aiWeightHaircut: number;
  rationale: string[];
  conflictingEvidence: string[];
  evidence: EvidenceSource[];
  qualityFlags: QualityFlag[];
  portfolioAvailable: boolean;
  portfolioImpact: string;
  backtestLimitation?: string;
  auditEvents: string[];
  charts: ResearchChartSuite;
};

export function buildResearchDetail(
  instrumentId: InstrumentId,
  options: { portfolioAvailable?: boolean } = {},
): ResearchDetailViewModel {
  const portfolioAvailable = options.portfolioAvailable !== false;
  const isLimitedBacktest = instrumentId === "KR:XKRX:000830";
  return {
    instrumentId,
    displayName: instrumentId === "KR:XKRX:000830" ? "Samsung C&T" : instrumentId === "US:XNAS:AAPL" ? "Apple" : "NVIDIA",
    actionLabel: isLimitedBacktest ? "HOLD" : "BUY",
    confidence: isLimitedBacktest ? 0.57 : 0.88,
    finality: "confirmed",
    tradeTimingPlan: isLimitedBacktest
      ? timing("HOLD", 154000, 159000, 148000, 171000, 178000)
      : timing("BUY", 118, 124, 109, 138, 146),
    aiContribution: isLimitedBacktest ? 0.18 : 0.42,
    aiWeightHaircut: isLimitedBacktest ? 0 : 0.06,
    rationale: isLimitedBacktest
      ? ["Dividend stability supports monitoring, but backtest evidence is limited."]
      : ["Trend, volume confirmation, and AI infrastructure catalyst evidence align with the Strategy Profile."],
    conflictingEvidence: isLimitedBacktest
      ? ["Insufficient backtest sample for this instrument."]
      : ["High volatility requires disciplined entry and stop monitoring."],
    evidence: [
      {
        sourceType: "news",
        title: "AI infrastructure demand update",
        url: "https://example.com/ai-demand",
        observedAt: "2026-06-18T00:00:00.000Z",
        finality: "confirmed",
      },
    ],
    qualityFlags: isLimitedBacktest ? ["insufficient_backtest_sample"] : ["high_volatility"],
    portfolioAvailable,
    portfolioImpact: portfolioAvailable
      ? "Add-on candidate, but position size should respect semiconductor concentration."
      : "Portfolio unavailable; portfolio-specific claims are not shown.",
    ...(isLimitedBacktest ? { backtestLimitation: "Insufficient backtest sample for this instrument." } : {}),
    auditEvents: [
      "Confirmed Signal recalculated from end-of-day data.",
      "Strategy Profile version swing-momentum-v1 applied.",
      "AI Weight Haircut recorded for source uncertainty.",
    ],
    charts: buildResearchChartSuite(instrumentId),
  };
}

export function renderResearchDetailPage(detail: ResearchDetailViewModel): string {
  return [
    '<article class="research-detail">',
    `<header class="terminal-header"><p>${escapeHtml(detail.instrumentId)}</p><h1>${escapeHtml(detail.displayName)} Research Detail</h1></header>`,
    fixedSummary(detail),
    '<section class="report-tabs" aria-label="Report tabs"><h2>Report tabs</h2><nav class="segmented-tabs" aria-label="Research Report Panels"><span class="tab-chip">Evidence</span><span class="tab-chip">Technical</span><span class="tab-chip">AI Context</span><span class="tab-chip">Portfolio</span><span class="tab-chip">Backtest</span><span class="tab-chip">Risk</span><span class="tab-chip">Audit</span></nav>',
    panel("Evidence Panel", [
      ...detail.evidence.map((source) => `${source.sourceType}: ${source.title}`),
      ...detail.conflictingEvidence,
    ]),
    panel("Technical Report Panel", ["Recharts technical indicators are rendered from chart-ready models."]),
    panel("AI Context Report Panel", [`AI contribution: ${detail.aiContribution}`, `AI Weight Haircut: ${detail.aiWeightHaircut}`]),
    panel("Portfolio Impact Report Panel", [detail.portfolioImpact]),
    panel("Backtest Report Panel", detail.backtestLimitation
      ? [detail.backtestLimitation, "Review required before interpreting performance support."]
      : ["Win rate, expected value, maximum drawdown, and equity curve available."]),
    panel("Risk Report Panel", [`Quality flags: ${detail.qualityFlags.join(", ")}`, ...detail.conflictingEvidence]),
    panel("Audit Panel", detail.auditEvents),
    panel("Research and Report Actions Panel", [
      "Generate or update an editable Research Note from this evidence.",
      "Draft a Client Report only after Research Note approval and Portfolio context review.",
    ]),
    "</section>",
    "</article>",
  ].join("");
}

function fixedSummary(detail: ResearchDetailViewModel): string {
  const actionClass = detail.actionLabel === "BUY" ? "action-buy" : detail.actionLabel === "HOLD" ? "action-hold" : detail.actionLabel === "SELL" ? "action-sell" : "action-review";
  return [
    '<section class="fixed-summary">',
    '<div class="command-bar">',
    `<span>${escapeHtml(detail.instrumentId)}</span>`,
    `<span class="action-badge ${actionClass}">${escapeHtml(detail.actionLabel)}</span>`,
    `<span>Confidence ${formatPercent(detail.confidence)}</span>`,
    `<span>${escapeHtml(detail.finality)}</span>`,
    "<span>Review Required conditions visible</span>",
    "</div>",
    "<h2>Signal Brief</h2>",
    `<p><strong>${escapeHtml(detail.actionLabel)}</strong> · Confidence ${formatPercent(detail.confidence)} · ${detail.finality}</p>`,
    "<p>Decision-support only. Review Required conditions and conflicting evidence must be checked before external use.</p>",
    `<p>${detail.rationale.map(escapeHtml).join(" ")}</p>`,
    "<h2>Trade Timing</h2>",
    `<p>Entry Zone: ${formatPriceRange(detail.tradeTimingPlan.entryZone)}</p>`,
    `<p>Stop Level: ${formatPrice(detail.tradeTimingPlan.stopLevel)}</p>`,
    `<p>Target Zone: ${formatPriceRange(detail.tradeTimingPlan.targetZone)}</p>`,
    "</section>",
  ].join("");
}

function panel(title: string, rows: string[]): string {
  return [`<section class="report-panel"><h3>${escapeHtml(title)}</h3>`, ...rows.map((row) => `<p>${escapeHtml(row)}</p>`), "</section>"].join("");
}

function timing(
  actionLabel: ActionLabel,
  entryLow: number,
  entryHigh: number,
  stopLevel: number,
  targetLow: number,
  targetHigh: number,
): TradeTimingPlan {
  return {
    actionLabel,
    entryZone: { low: entryLow, high: entryHigh },
    stopLevel,
    targetZone: { low: targetLow, high: targetHigh },
    timeHorizon: "days_to_weeks",
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
```

- [ ] **Step 4: Wire the detail page**

Replace `apps/web/app/signals/[instrumentId]/page.tsx` with:

```typescript
import type { InstrumentId } from "../../../src/domain/market";
import { buildResearchDetail, renderResearchDetailPage } from "../../../src/modules/research-detail";

export default async function SignalDetailPage({
  params,
}: {
  params: Promise<{ instrumentId: string }>;
}) {
  const { instrumentId } = await params;
  const detail = buildResearchDetail(decodeURIComponent(instrumentId) as InstrumentId);
  const html = renderResearchDetailPage(detail);

  return <main dangerouslySetInnerHTML={{ __html: html }} />;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run:

```bash
npm --prefix apps/web test -- --run tests/research-detail.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/modules/research-detail.ts apps/web/tests/research-detail.test.ts apps/web/app/signals/[instrumentId]/page.tsx
git commit -m "feat: render professional research detail panels"
```

---

### Task 8: Full validation

**Files:**
- Modify only files introduced or changed by Tasks 1-7 if validation exposes defects.

**Interfaces:**
- Consumes all interfaces from Tasks 1-7.
- Produces a passing web test suite, typecheck, and build.

- [ ] **Step 1: Run the complete web test suite**

Run:

```bash
npm --prefix apps/web test -- --run
```

Expected: PASS for all web tests.

- [ ] **Step 2: Run the web typecheck**

Run:

```bash
npm --prefix apps/web run typecheck
```

Expected: PASS with no TypeScript errors.

- [ ] **Step 3: Run the web build**

Run:

```bash
npm --prefix apps/web run build
```

Expected: PASS and a successful Next.js production build.

- [ ] **Step 4: Fix validation defects with focused tests**

If Step 1, Step 2, or Step 3 fails, change only files introduced or modified by this plan. Add or adjust a focused test that proves the defect is fixed, then rerun the failing command.

Example focused route decoding test for `apps/web/tests/research-detail.test.ts`:

```typescript
it("builds detail for an encoded InstrumentId after route decoding", () => {
  const decoded = decodeURIComponent("US%3AXNAS%3ANVDA");

  expect(buildResearchDetail(decoded as "US:XNAS:NVDA").instrumentId).toBe("US:XNAS:NVDA");
});
```

Run:

```bash
npm --prefix apps/web test -- --run tests/research-detail.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit validation fixes if needed**

If files changed during Task 8, run:

```bash
git add apps/web
git commit -m "fix: polish stock research search integration"
```

If no files changed during Task 8, do not create an empty commit. Record the passing commands in the task completion note.
