# Professional Stock Signal App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the MVP for a professional stock signal SaaS that produces auditable Trade Timing Plans for Korean and US equities.

**Architecture:** Use a deep-module design with small Interfaces for market data, analysis jobs, portfolio interpretation, research notes, reports, and persistence. Next.js owns the professional workflow, dashboard, API routes, Prisma persistence, and report rendering; the Python worker owns analysis-heavy Implementation for feature generation, signal decisions, AI context scoring, and Strategy Backtests.

**Tech Stack:** Next.js, TypeScript, Tailwind CSS, Vitest, PostgreSQL, Prisma, Python 3.11, pytest, pandas, FastAPI, Docker Compose.

## Global Constraints

- Load `AGENTS.md`, `CONTEXT.md`, `docs/adr/`, `docs/superpowers/specs/`, and this plan before implementing.
- Use canonical terms from `CONTEXT.md`: Investment Professional, Research Note, Client Report, Trade Timing Plan, Strategy Profile, Market Data Provider, Provisional Signal, Confirmed Signal, Strategy Backtest, Workspace, Portfolio, Alert Event, Action Label, InstrumentId, Broker Connection, AI Weight Haircut, Audit Log.
- The MVP supports Korean and US equities.
- The trading horizon is swing trading over days to weeks.
- The product is a professional decision-support system, not an automatic investment adviser or auto-trading system.
- Broker Connections are read-only and must not place, modify, or cancel orders.
- Provisional Signals are safe for monitoring and alerts; Confirmed Signals are the default source for Audit Logs, Research Notes, and approved reports.
- AI context participates in scoring, but every AI-influenced Signal Decision must show AI impact, evidence, and confidence.
- Weak, stale, contradictory, or insufficient AI evidence applies an AI Weight Haircut.
- Compact dashboard surfaces may use BUY, HOLD, and SELL Action Labels; detail pages, Research Notes, and Client Reports must include evidence and professional-review context.
- Client Reports are optional, externally shareable artifacts generated from approved Research Notes and portfolio context.
- User-editable strategy rule builders, automated order execution, direct customer recommendation delivery, and multi-user RBAC are out of scope for MVP.

---

## File Structure

Create a monorepo-style app under `apps/`:

```text
apps/
  web/
    app/
      api/
        analysis/run/route.ts
        broker/import/route.ts
        reports/[id]/pdf/route.ts
      page.tsx
      signals/[instrumentId]/page.tsx
    src/
      domain/
        market.ts
        strategy.ts
        signals.ts
        portfolio.ts
        research.ts
        audit.ts
      modules/
        market-data/
          interface.ts
          sample-provider.ts
          kis-provider.ts
          polygon-provider.ts
        analysis-runner.ts
        portfolio-interpretation.ts
        research-output.ts
        report-renderer.ts
        audit-log.ts
      persistence/
        prisma.ts
        repositories.ts
      test/
        fixtures.ts
    tests/
      *.test.ts
    prisma/
      schema.prisma
    package.json
    vitest.config.ts
    tsconfig.json
    next.config.mjs
  worker/
    src/
      worker/
        __init__.py
        app.py
        domain.py
        features.py
        ai_context.py
        signal_decision.py
        backtest.py
    tests/
      test_features.py
      test_signal_decision.py
      test_backtest.py
    pyproject.toml
docker-compose.yml
package.json
```

Module boundaries:

- `MarketDataProvider` is the seam for KIS Developers, Polygon.io, and Sample Provider Adapters.
- `AnalysisRunner` is the seam between the Next.js app and Python worker.
- `SignalDecisionModule` lives in the Python worker and returns Trade Timing Plans.
- `PortfolioInterpretationModule` lives in TypeScript because Portfolio and Broker Connection data are product workflow concerns.
- `ResearchOutputModule` lives in TypeScript because Research Notes and optional Client Reports are professional workflow artifacts.
- `ReportRenderer` has HTML preview and PDF Adapter implementations.

---

### Task 1: Scaffold the monorepo and shared domain language

**Files:**
- Create: `package.json`
- Create: `docker-compose.yml`
- Create: `apps/web/package.json`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/vitest.config.ts`
- Create: `apps/web/next.config.mjs`
- Create: `apps/web/Dockerfile`
- Create: `apps/web/src/domain/market.ts`
- Create: `apps/web/src/domain/strategy.ts`
- Create: `apps/web/src/domain/signals.ts`
- Create: `apps/web/src/domain/portfolio.ts`
- Create: `apps/web/src/domain/research.ts`
- Create: `apps/web/src/domain/audit.ts`
- Create: `apps/web/tests/domain.test.ts`
- Create: `apps/worker/pyproject.toml`
- Create: `apps/worker/Dockerfile`
- Create: `apps/worker/src/worker/__init__.py`
- Create: `apps/worker/src/worker/domain.py`
- Create: `apps/worker/tests/test_domain.py`

**Interfaces:**
- Produces: TypeScript domain types `InstrumentId`, `MarketSnapshot`, `StrategyProfile`, `SignalDecision`, `TradeTimingPlan`, `Portfolio`, `ResearchNote`, `AuditEvent`.
- Produces: Python dataclasses `InstrumentId`, `StrategyProfile`, `FeatureSet`, `AIContextScore`, `SignalDecision`.

- [ ] **Step 1: Write failing TypeScript domain tests**

Create `apps/web/tests/domain.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { parseInstrumentId, toInstrumentId } from "../src/domain/market";
import { defaultSwingMomentumProfile } from "../src/domain/strategy";
import { isConfirmedSignal, isProvisionalSignal } from "../src/domain/signals";

describe("domain language", () => {
  it("round-trips canonical InstrumentId values", () => {
    const instrumentId = toInstrumentId({
      market: "KR",
      exchange: "XKRX",
      symbol: "005930",
    });

    expect(instrumentId).toBe("KR:XKRX:005930");
    expect(parseInstrumentId(instrumentId)).toEqual({
      market: "KR",
      exchange: "XKRX",
      symbol: "005930",
    });
  });

  it("defines the default Strategy Profile AI weighting", () => {
    expect(defaultSwingMomentumProfile.aiWeight).toBe(0.4);
    expect(defaultSwingMomentumProfile.rulesWeight).toBe(0.6);
    expect(defaultSwingMomentumProfile.aiWeightRange).toEqual({
      min: 0.2,
      max: 0.6,
    });
  });

  it("distinguishes Provisional Signal from Confirmed Signal", () => {
    expect(isProvisionalSignal({ finality: "provisional" })).toBe(true);
    expect(isConfirmedSignal({ finality: "confirmed" })).toBe(true);
  });
});
```

- [ ] **Step 2: Write failing Python domain tests**

Create `apps/worker/tests/test_domain.py`:

```python
from worker.domain import InstrumentId, StrategyProfile


def test_instrument_id_round_trip() -> None:
    instrument_id = InstrumentId(market="US", exchange="XNAS", symbol="AAPL")

    assert str(instrument_id) == "US:XNAS:AAPL"
    assert InstrumentId.parse("US:XNAS:AAPL") == instrument_id


def test_default_strategy_profile_weights() -> None:
    profile = StrategyProfile.default_swing_momentum()

    assert profile.rules_weight == 0.6
    assert profile.ai_weight == 0.4
    assert profile.min_ai_weight == 0.2
    assert profile.max_ai_weight == 0.6
```

- [ ] **Step 3: Run tests to verify they fail**

Run:

```bash
npm --prefix apps/web test -- --run tests/domain.test.ts
cd apps/worker && pytest tests/test_domain.py -v
```

Expected:

```text
Cannot find module '../src/domain/market'
ModuleNotFoundError: No module named 'worker'
```

- [ ] **Step 4: Create root package and Docker Compose**

Create `package.json`:

```json
{
  "name": "professional-stock-signal-app",
  "private": true,
  "scripts": {
    "test": "npm --prefix apps/web test",
    "test:web": "npm --prefix apps/web test",
    "test:worker": "cd apps/worker && pytest",
    "dev": "docker compose up --build"
  },
  "workspaces": [
    "apps/web"
  ]
}
```

Create `docker-compose.yml`:

```yaml
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_USER: stockapp
      POSTGRES_PASSWORD: stockapp
      POSTGRES_DB: stockapp
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U stockapp -d stockapp"]
      interval: 5s
      timeout: 5s
      retries: 10

  worker:
    build:
      context: ./apps/worker
    environment:
      PYTHONPATH: /app/src
    ports:
      - "8000:8000"

  web:
    build:
      context: ./apps/web
    environment:
      DATABASE_URL: postgresql://stockapp:stockapp@postgres:5432/stockapp
      ANALYSIS_WORKER_URL: http://worker:8000
    ports:
      - "3000:3000"
    depends_on:
      postgres:
        condition: service_healthy
      worker:
        condition: service_started
```

- [ ] **Step 5: Create web app config**

Create `apps/web/package.json`:

```json
{
  "name": "@stock-signal/web",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "vitest",
    "typecheck": "tsc --noEmit",
    "dev": "next dev",
    "build": "next build"
  },
  "dependencies": {
    "@prisma/client": "^5.22.0",
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@types/node": "^22.9.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "prisma": "^5.22.0",
    "typescript": "^5.6.3",
    "vitest": "^2.1.4"
  }
}
```

Create `apps/web/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "es2022"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
```

Create `apps/web/vitest.config.ts`:

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
```

Create `apps/web/next.config.mjs`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {};

export default nextConfig;
```

Create `apps/web/Dockerfile`:

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]
```

- [ ] **Step 6: Create TypeScript domain modules**

Create `apps/web/src/domain/market.ts`:

```typescript
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
```

Create `apps/web/src/domain/strategy.ts`:

```typescript
export type StrategyProfile = {
  id: string;
  name: string;
  horizon: "swing_days_to_weeks";
  rulesWeight: number;
  aiWeight: number;
  aiWeightRange: {
    min: number;
    max: number;
  };
  minimumEvidenceSources: number;
  maximumAiWeightWithoutFreshSources: number;
};

export const defaultSwingMomentumProfile: StrategyProfile = {
  id: "swing-momentum-v1",
  name: "Swing Momentum",
  horizon: "swing_days_to_weeks",
  rulesWeight: 0.6,
  aiWeight: 0.4,
  aiWeightRange: {
    min: 0.2,
    max: 0.6,
  },
  minimumEvidenceSources: 2,
  maximumAiWeightWithoutFreshSources: 0.15,
};
```

Create `apps/web/src/domain/signals.ts`:

```typescript
import type { DataFinality, InstrumentId, QualityFlag } from "./market";

export type ActionLabel = "BUY" | "HOLD" | "SELL" | "REVIEW_REQUIRED";

export type TradeTimingPlan = {
  actionLabel: ActionLabel;
  entryZone: {
    low: number;
    high: number;
  };
  stopLevel: number;
  targetZone: {
    low: number;
    high: number;
  };
  timeHorizon: "days_to_weeks";
};

export type SignalDecision = {
  instrumentId: InstrumentId;
  finality: DataFinality;
  confidence: number;
  rulesContribution: number;
  aiContribution: number;
  aiWeightHaircut: number;
  qualityFlags: QualityFlag[];
  tradeTimingPlan: TradeTimingPlan;
  rationale: string[];
};

export function isProvisionalSignal(signal: { finality: DataFinality }): boolean {
  return signal.finality === "provisional";
}

export function isConfirmedSignal(signal: { finality: DataFinality }): boolean {
  return signal.finality === "confirmed";
}
```

Create `apps/web/src/domain/portfolio.ts`:

```typescript
import type { InstrumentId } from "./market";

export type PortfolioType = "personal" | "client" | "model";

export type Holding = {
  instrumentId: InstrumentId;
  quantity: number;
  averageEntryPrice: number;
  marketValue: number;
};

export type Portfolio = {
  id: string;
  workspaceId: string;
  type: PortfolioType;
  name: string;
  holdings: Holding[];
};

export type PortfolioActionLabel =
  | "NEW_BUY_CANDIDATE"
  | "ADD_ON_CANDIDATE"
  | "HOLD_AND_MONITOR"
  | "TRIM_CANDIDATE"
  | "EXIT_CANDIDATE"
  | "REVIEW_REQUIRED";
```

Create `apps/web/src/domain/research.ts`:

```typescript
import type { InstrumentId } from "./market";

export type ResearchNote = {
  id: string;
  instrumentId: InstrumentId;
  title: string;
  bodyMarkdown: string;
  approved: boolean;
  createdAt: string;
};

export type ClientReport = {
  id: string;
  title: string;
  bodyMarkdown: string;
  approved: boolean;
};
```

Create `apps/web/src/domain/audit.ts`:

```typescript
export type AuditEventType =
  | "DATA_VERSION_USED"
  | "STRATEGY_PROFILE_USED"
  | "AI_WEIGHT_APPLIED"
  | "SIGNAL_OUTPUT_CREATED"
  | "USER_OVERRIDE_CREATED"
  | "RESEARCH_NOTE_APPROVED"
  | "REPORT_EXPORTED";

export type AuditEvent = {
  id: string;
  type: AuditEventType;
  subjectId: string;
  occurredAt: string;
  metadata: Record<string, string | number | boolean>;
};
```

- [ ] **Step 7: Create Python worker domain modules**

Create `apps/worker/pyproject.toml`:

```toml
[project]
name = "stock-signal-worker"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = [
  "fastapi>=0.115.0",
  "uvicorn>=0.32.0",
  "pandas>=2.2.0",
  "pydantic>=2.9.0",
]

[project.optional-dependencies]
test = [
  "pytest>=8.3.0",
]

[build-system]
requires = ["setuptools>=75.0"]
build-backend = "setuptools.build_meta"

[tool.setuptools.packages.find]
where = ["src"]

[tool.pytest.ini_options]
pythonpath = ["src"]
testpaths = ["tests"]
```

Create `apps/worker/Dockerfile`:

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY pyproject.toml ./
RUN pip install -e .
COPY src ./src
ENV PYTHONPATH=/app/src
EXPOSE 8000
CMD ["uvicorn", "worker.app:app", "--host", "0.0.0.0", "--port", "8000"]
```

Create `apps/worker/src/worker/__init__.py`:

```python
```

Create `apps/worker/src/worker/domain.py`:

```python
from dataclasses import dataclass
from typing import Literal


Market = Literal["KR", "US"]
Exchange = Literal["XKRX", "XKOSDAQ", "XNYS", "XNAS"]
Finality = Literal["provisional", "confirmed"]
ActionLabel = Literal["BUY", "HOLD", "SELL", "REVIEW_REQUIRED"]


@dataclass(frozen=True)
class InstrumentId:
    market: Market
    exchange: Exchange
    symbol: str

    def __str__(self) -> str:
        return f"{self.market}:{self.exchange}:{self.symbol}"

    @staticmethod
    def parse(value: str) -> "InstrumentId":
        parts = value.split(":")
        if len(parts) != 3:
            raise ValueError(f"Invalid InstrumentId: {value}")
        market, exchange, symbol = parts
        if market not in ("KR", "US"):
            raise ValueError(f"Invalid InstrumentId market: {market}")
        if exchange not in ("XKRX", "XKOSDAQ", "XNYS", "XNAS"):
            raise ValueError(f"Invalid InstrumentId exchange: {exchange}")
        if not symbol:
            raise ValueError("InstrumentId symbol must not be empty")
        return InstrumentId(market=market, exchange=exchange, symbol=symbol)


@dataclass(frozen=True)
class StrategyProfile:
    id: str
    name: str
    rules_weight: float
    ai_weight: float
    min_ai_weight: float
    max_ai_weight: float
    minimum_evidence_sources: int
    maximum_ai_weight_without_fresh_sources: float

    @staticmethod
    def default_swing_momentum() -> "StrategyProfile":
        return StrategyProfile(
            id="swing-momentum-v1",
            name="Swing Momentum",
            rules_weight=0.6,
            ai_weight=0.4,
            min_ai_weight=0.2,
            max_ai_weight=0.6,
            minimum_evidence_sources=2,
            maximum_ai_weight_without_fresh_sources=0.15,
        )


@dataclass(frozen=True)
class FeatureSet:
    instrument_id: InstrumentId
    close: float
    moving_average_20: float
    moving_average_50: float
    rsi_14: float
    volume_surge_ratio: float
    volatility_20: float
    finality: Finality


@dataclass(frozen=True)
class AIContextScore:
    catalyst_score: float
    uncertainty_score: float
    evidence_quality_score: float
    freshness_score: float
    contradiction_count: int
    source_count: int


@dataclass(frozen=True)
class TradeTimingPlan:
    action_label: ActionLabel
    entry_low: float
    entry_high: float
    stop_level: float
    target_low: float
    target_high: float
    time_horizon: Literal["days_to_weeks"]


@dataclass(frozen=True)
class SignalDecision:
    instrument_id: InstrumentId
    finality: Finality
    confidence: float
    rules_contribution: float
    ai_contribution: float
    ai_weight_haircut: float
    quality_flags: tuple[str, ...]
    trade_timing_plan: TradeTimingPlan
    rationale: tuple[str, ...]
```

- [ ] **Step 8: Run tests to verify they pass**

Run:

```bash
npm install
pip install -e "apps/worker[test]"
npm --prefix apps/web test -- --run tests/domain.test.ts
cd apps/worker && pytest tests/test_domain.py -v
```

Expected:

```text
3 passed
2 passed
```

- [ ] **Step 9: Commit**

Run:

```bash
git add package.json package-lock.json docker-compose.yml apps/web apps/worker
git commit -m "feat: scaffold stock signal app domain"
```

---

### Task 2: Implement the Market Data Provider seam

**Files:**
- Create: `apps/web/src/modules/market-data/interface.ts`
- Create: `apps/web/src/modules/market-data/sample-provider.ts`
- Create: `apps/web/src/modules/market-data/kis-provider.ts`
- Create: `apps/web/src/modules/market-data/polygon-provider.ts`
- Create: `apps/web/tests/market-data.test.ts`

**Interfaces:**
- Consumes: `InstrumentId`, `MarketSnapshot`, `DataFinality` from `apps/web/src/domain/market.ts`.
- Produces: `MarketDataProvider.fetchSnapshot(request: MarketDataRequest): Promise<MarketSnapshot>`.
- Later tasks consume the provider through `MarketDataProvider` only.

- [ ] **Step 1: Write failing tests for provider behavior**

Create `apps/web/tests/market-data.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { createSampleMarketDataProvider } from "../src/modules/market-data/sample-provider";
import { createKisProvider } from "../src/modules/market-data/kis-provider";
import { createPolygonProvider } from "../src/modules/market-data/polygon-provider";

describe("MarketDataProvider seam", () => {
  it("returns a confirmed sample snapshot with quality metadata", async () => {
    const provider = createSampleMarketDataProvider();

    const snapshot = await provider.fetchSnapshot({
      instruments: ["KR:XKRX:005930"],
      asOf: "2026-06-18",
      finality: "confirmed",
    });

    expect(snapshot.finality).toBe("confirmed");
    expect(snapshot.bars).toHaveLength(1);
    expect(snapshot.bars[0].instrumentId).toBe("KR:XKRX:005930");
    expect(snapshot.qualityFlags).toContain("confirmed_end_of_day_data");
  });

  it("keeps KIS provider details behind the same Interface", async () => {
    const provider = createKisProvider({
      baseUrl: "https://example.test/kis",
      appKey: "key",
      appSecret: "secret",
      fetchJson: async () => ({
        output: {
          stck_oprc: "70000",
          stck_hgpr: "73000",
          stck_lwpr: "69000",
          stck_prpr: "72000",
          acml_vol: "1000000",
        },
      }),
    });

    const snapshot = await provider.fetchSnapshot({
      instruments: ["KR:XKRX:005930"],
      asOf: "2026-06-18T10:00:00+09:00",
      finality: "provisional",
    });

    expect(snapshot.bars[0].close).toBe(72000);
    expect(snapshot.qualityFlags).toContain("delayed_intraday_data");
  });

  it("keeps Polygon provider details behind the same Interface", async () => {
    const provider = createPolygonProvider({
      baseUrl: "https://example.test/polygon",
      apiKey: "key",
      fetchJson: async () => ({
        results: [
          {
            o: 190,
            h: 195,
            l: 188,
            c: 193,
            v: 50000000,
          },
        ],
      }),
    });

    const snapshot = await provider.fetchSnapshot({
      instruments: ["US:XNAS:AAPL"],
      asOf: "2026-06-18",
      finality: "confirmed",
    });

    expect(snapshot.bars[0].close).toBe(193);
    expect(snapshot.qualityFlags).toContain("confirmed_end_of_day_data");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm --prefix apps/web test -- --run tests/market-data.test.ts
```

Expected:

```text
Cannot find module '../src/modules/market-data/sample-provider'
```

- [ ] **Step 3: Implement the provider Interface**

Create `apps/web/src/modules/market-data/interface.ts`:

```typescript
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
```

- [ ] **Step 4: Implement Sample Provider**

Create `apps/web/src/modules/market-data/sample-provider.ts`:

```typescript
import type { MarketSnapshot, OhlcvBar, QualityFlag } from "../../domain/market";
import type { MarketDataProvider } from "./interface";

export function createSampleMarketDataProvider(): MarketDataProvider {
  return {
    async fetchSnapshot(request) {
      const bars: OhlcvBar[] = request.instruments.map((instrumentId, index) => ({
        instrumentId,
        asOf: request.asOf,
        open: 100 + index,
        high: 110 + index,
        low: 95 + index,
        close: 108 + index,
        volume: 1_000_000 + index,
        finality: request.finality,
      }));

      const qualityFlags: QualityFlag[] =
        request.finality === "confirmed"
          ? ["confirmed_end_of_day_data"]
          : ["delayed_intraday_data"];

      const snapshot: MarketSnapshot = {
        asOf: request.asOf,
        finality: request.finality,
        bars,
        qualityFlags,
      };

      return snapshot;
    },
  };
}
```

- [ ] **Step 5: Implement KIS Provider Adapter**

Create `apps/web/src/modules/market-data/kis-provider.ts`:

```typescript
import type { OhlcvBar, QualityFlag } from "../../domain/market";
import { parseInstrumentId } from "../../domain/market";
import type { FetchJson, MarketDataProvider } from "./interface";

type KisConfig = {
  baseUrl: string;
  appKey: string;
  appSecret: string;
  fetchJson?: FetchJson;
};

type KisPriceOutput = {
  output: {
    stck_oprc: string;
    stck_hgpr: string;
    stck_lwpr: string;
    stck_prpr: string;
    acml_vol: string;
  };
};

export function createKisProvider(config: KisConfig): MarketDataProvider {
  const fetchJson = config.fetchJson ?? defaultFetchJson;

  return {
    async fetchSnapshot(request) {
      const bars: OhlcvBar[] = [];

      for (const instrumentId of request.instruments) {
        const parts = parseInstrumentId(instrumentId);
        const url = `${config.baseUrl}/price?exchange=${parts.exchange}&symbol=${parts.symbol}`;
        const response = (await fetchJson(url, {
          headers: {
            appkey: config.appKey,
            appsecret: config.appSecret,
          },
        })) as KisPriceOutput;

        bars.push({
          instrumentId,
          asOf: request.asOf,
          open: Number(response.output.stck_oprc),
          high: Number(response.output.stck_hgpr),
          low: Number(response.output.stck_lwpr),
          close: Number(response.output.stck_prpr),
          volume: Number(response.output.acml_vol),
          finality: request.finality,
        });
      }

      const qualityFlags: QualityFlag[] =
        request.finality === "confirmed"
          ? ["confirmed_end_of_day_data"]
          : ["delayed_intraday_data"];

      return {
        asOf: request.asOf,
        finality: request.finality,
        bars,
        qualityFlags,
      };
    },
  };
}

async function defaultFetchJson(url: string, init?: RequestInit): Promise<unknown> {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(`KIS request failed with ${response.status}`);
  }
  return response.json();
}
```

- [ ] **Step 6: Implement Polygon Provider Adapter**

Create `apps/web/src/modules/market-data/polygon-provider.ts`:

```typescript
import type { OhlcvBar, QualityFlag } from "../../domain/market";
import { parseInstrumentId } from "../../domain/market";
import type { FetchJson, MarketDataProvider } from "./interface";

type PolygonConfig = {
  baseUrl: string;
  apiKey: string;
  fetchJson?: FetchJson;
};

type PolygonAggregateResponse = {
  results: Array<{
    o: number;
    h: number;
    l: number;
    c: number;
    v: number;
  }>;
};

export function createPolygonProvider(config: PolygonConfig): MarketDataProvider {
  const fetchJson = config.fetchJson ?? defaultFetchJson;

  return {
    async fetchSnapshot(request) {
      const bars: OhlcvBar[] = [];

      for (const instrumentId of request.instruments) {
        const parts = parseInstrumentId(instrumentId);
        const url = `${config.baseUrl}/v2/aggs/ticker/${parts.symbol}/prev?apiKey=${config.apiKey}`;
        const response = (await fetchJson(url)) as PolygonAggregateResponse;
        const latest = response.results[0];
        if (!latest) {
          throw new Error(`Polygon returned no aggregate for ${instrumentId}`);
        }

        bars.push({
          instrumentId,
          asOf: request.asOf,
          open: latest.o,
          high: latest.h,
          low: latest.l,
          close: latest.c,
          volume: latest.v,
          finality: request.finality,
        });
      }

      const qualityFlags: QualityFlag[] =
        request.finality === "confirmed"
          ? ["confirmed_end_of_day_data"]
          : ["delayed_intraday_data"];

      return {
        asOf: request.asOf,
        finality: request.finality,
        bars,
        qualityFlags,
      };
    },
  };
}

async function defaultFetchJson(url: string, init?: RequestInit): Promise<unknown> {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(`Polygon request failed with ${response.status}`);
  }
  return response.json();
}
```

- [ ] **Step 7: Run tests to verify they pass**

Run:

```bash
npm --prefix apps/web test -- --run tests/market-data.test.ts
```

Expected:

```text
3 passed
```

- [ ] **Step 8: Commit**

Run:

```bash
git add apps/web/src/modules/market-data apps/web/tests/market-data.test.ts
git commit -m "feat: add market data provider seam"
```

---

### Task 3: Implement the Python analysis worker for features and Signal Decisions

**Files:**
- Create: `apps/worker/src/worker/features.py`
- Create: `apps/worker/src/worker/ai_context.py`
- Create: `apps/worker/src/worker/signal_decision.py`
- Create: `apps/worker/src/worker/app.py`
- Create: `apps/worker/tests/test_features.py`
- Create: `apps/worker/tests/test_signal_decision.py`

**Interfaces:**
- Consumes: Python `InstrumentId`, `StrategyProfile`, `AIContextScore`, `FeatureSet`.
- Produces: `build_feature_set(bars, finality) -> FeatureSet`.
- Produces: `apply_ai_weight_haircut(profile, ai_context) -> float`.
- Produces: `create_signal_decision(feature_set, ai_context, profile) -> SignalDecision`.
- Produces: FastAPI `POST /analysis/run`.

- [ ] **Step 1: Write failing feature tests**

Create `apps/worker/tests/test_features.py`:

```python
from worker.domain import InstrumentId
from worker.features import build_feature_set


def test_build_feature_set_from_ohlcv_bars() -> None:
    instrument_id = InstrumentId.parse("US:XNAS:AAPL")
    bars = [
        {
            "instrument_id": str(instrument_id),
            "close": 100 + index,
            "volume": 1_000_000 + (index * 10_000),
        }
        for index in range(60)
    ]

    feature_set = build_feature_set(instrument_id, bars, "confirmed")

    assert feature_set.instrument_id == instrument_id
    assert feature_set.close == 159
    assert feature_set.moving_average_20 == 149.5
    assert feature_set.moving_average_50 == 134.5
    assert feature_set.volume_surge_ratio > 1
    assert feature_set.finality == "confirmed"
```

- [ ] **Step 2: Write failing Signal Decision tests**

Create `apps/worker/tests/test_signal_decision.py`:

```python
from worker.ai_context import apply_ai_weight_haircut
from worker.domain import AIContextScore, FeatureSet, InstrumentId, StrategyProfile
from worker.signal_decision import create_signal_decision


def test_ai_weight_haircut_reduces_weak_evidence() -> None:
    profile = StrategyProfile.default_swing_momentum()
    ai_context = AIContextScore(
        catalyst_score=0.8,
        uncertainty_score=0.2,
        evidence_quality_score=0.4,
        freshness_score=0.3,
        contradiction_count=0,
        source_count=1,
    )

    adjusted_weight = apply_ai_weight_haircut(profile, ai_context)

    assert adjusted_weight == 0.15


def test_create_buy_signal_decision_with_trade_timing_plan() -> None:
    instrument_id = InstrumentId.parse("US:XNAS:AAPL")
    feature_set = FeatureSet(
        instrument_id=instrument_id,
        close=100,
        moving_average_20=105,
        moving_average_50=95,
        rsi_14=58,
        volume_surge_ratio=1.4,
        volatility_20=0.08,
        finality="confirmed",
    )
    ai_context = AIContextScore(
        catalyst_score=0.7,
        uncertainty_score=0.2,
        evidence_quality_score=0.9,
        freshness_score=0.9,
        contradiction_count=0,
        source_count=3,
    )

    decision = create_signal_decision(
        feature_set=feature_set,
        ai_context=ai_context,
        profile=StrategyProfile.default_swing_momentum(),
    )

    assert decision.trade_timing_plan.action_label == "BUY"
    assert decision.trade_timing_plan.entry_low == 98.0
    assert decision.trade_timing_plan.entry_high == 102.0
    assert decision.trade_timing_plan.stop_level == 92.0
    assert decision.trade_timing_plan.target_low == 110.0
    assert decision.trade_timing_plan.target_high == 116.0
    assert decision.ai_weight_haircut == 0
    assert decision.finality == "confirmed"
```

- [ ] **Step 3: Run tests to verify they fail**

Run:

```bash
cd apps/worker && pytest tests/test_features.py tests/test_signal_decision.py -v
```

Expected:

```text
ModuleNotFoundError: No module named 'worker.features'
```

- [ ] **Step 4: Implement feature generation**

Create `apps/worker/src/worker/features.py`:

```python
from statistics import mean, pstdev
from typing import Iterable

from worker.domain import FeatureSet, Finality, InstrumentId


def build_feature_set(
    instrument_id: InstrumentId,
    bars: Iterable[dict[str, float | str]],
    finality: Finality,
) -> FeatureSet:
    materialized = list(bars)
    if len(materialized) < 50:
        raise ValueError("At least 50 bars are required to build a FeatureSet")

    closes = [float(bar["close"]) for bar in materialized]
    volumes = [float(bar["volume"]) for bar in materialized]
    close = closes[-1]
    moving_average_20 = round(mean(closes[-20:]), 4)
    moving_average_50 = round(mean(closes[-50:]), 4)
    average_volume_20 = mean(volumes[-20:])
    average_volume_50 = mean(volumes[-50:])
    volume_surge_ratio = round(average_volume_20 / average_volume_50, 4)
    volatility_20 = round(pstdev(closes[-20:]) / close, 4)

    gains = []
    losses = []
    for previous, current in zip(closes[-15:-1], closes[-14:]):
        change = current - previous
        if change >= 0:
            gains.append(change)
            losses.append(0)
        else:
            gains.append(0)
            losses.append(abs(change))
    average_gain = mean(gains)
    average_loss = mean(losses) or 0.0001
    relative_strength = average_gain / average_loss
    rsi_14 = round(100 - (100 / (1 + relative_strength)), 2)

    return FeatureSet(
        instrument_id=instrument_id,
        close=close,
        moving_average_20=moving_average_20,
        moving_average_50=moving_average_50,
        rsi_14=rsi_14,
        volume_surge_ratio=volume_surge_ratio,
        volatility_20=volatility_20,
        finality=finality,
    )
```

- [ ] **Step 5: Implement AI Weight Haircut**

Create `apps/worker/src/worker/ai_context.py`:

```python
from worker.domain import AIContextScore, StrategyProfile


def apply_ai_weight_haircut(
    profile: StrategyProfile,
    ai_context: AIContextScore,
) -> float:
    evidence_is_weak = (
        ai_context.source_count < profile.minimum_evidence_sources
        or ai_context.evidence_quality_score < 0.7
        or ai_context.freshness_score < 0.7
        or ai_context.contradiction_count > 0
    )

    if evidence_is_weak:
        return profile.maximum_ai_weight_without_fresh_sources

    return profile.ai_weight
```

- [ ] **Step 6: Implement Signal Decision Module**

Create `apps/worker/src/worker/signal_decision.py`:

```python
from worker.ai_context import apply_ai_weight_haircut
from worker.domain import AIContextScore, FeatureSet, SignalDecision, StrategyProfile, TradeTimingPlan


def create_signal_decision(
    feature_set: FeatureSet,
    ai_context: AIContextScore,
    profile: StrategyProfile,
) -> SignalDecision:
    adjusted_ai_weight = apply_ai_weight_haircut(profile, ai_context)
    ai_weight_haircut = round(profile.ai_weight - adjusted_ai_weight, 4)

    trend_score = 1 if feature_set.moving_average_20 > feature_set.moving_average_50 else -1
    momentum_score = 1 if 45 <= feature_set.rsi_14 <= 70 else -1
    volume_score = 1 if feature_set.volume_surge_ratio >= 1.05 else 0
    rules_raw_score = (trend_score + momentum_score + volume_score) / 3
    ai_raw_score = ai_context.catalyst_score - ai_context.uncertainty_score

    rules_contribution = round(rules_raw_score * profile.rules_weight, 4)
    ai_contribution = round(ai_raw_score * adjusted_ai_weight, 4)
    total_score = rules_contribution + ai_contribution

    quality_flags: list[str] = []
    if ai_weight_haircut > 0:
        quality_flags.append("weak_ai_source_evidence")
    if feature_set.volatility_20 > 0.12:
        quality_flags.append("high_volatility")

    if quality_flags and total_score < 0.25:
        action_label = "REVIEW_REQUIRED"
    elif total_score >= 0.35:
        action_label = "BUY"
    elif total_score <= -0.25:
        action_label = "SELL"
    else:
        action_label = "HOLD"

    close = feature_set.close
    trade_timing_plan = TradeTimingPlan(
        action_label=action_label,
        entry_low=round(close * 0.98, 2),
        entry_high=round(close * 1.02, 2),
        stop_level=round(close * 0.92, 2),
        target_low=round(close * 1.10, 2),
        target_high=round(close * 1.16, 2),
        time_horizon="days_to_weeks",
    )

    return SignalDecision(
        instrument_id=feature_set.instrument_id,
        finality=feature_set.finality,
        confidence=round(min(max(abs(total_score), 0), 1), 4),
        rules_contribution=rules_contribution,
        ai_contribution=ai_contribution,
        ai_weight_haircut=ai_weight_haircut,
        quality_flags=tuple(quality_flags),
        trade_timing_plan=trade_timing_plan,
        rationale=(
            f"Rules contribution: {rules_contribution}",
            f"AI contribution: {ai_contribution}",
            f"Total score: {round(total_score, 4)}",
        ),
    )
```

- [ ] **Step 7: Implement FastAPI worker route**

Create `apps/worker/src/worker/app.py`:

```python
from fastapi import FastAPI
from pydantic import AliasChoices, BaseModel, ConfigDict, Field

from worker.domain import (
    AIContextScore,
    EvidenceSource,
    EvidenceSourceType,
    Finality,
    InstrumentId,
    StrategyProfile,
)
from worker.features import build_feature_set
from worker.signal_decision import create_signal_decision

app = FastAPI()


class EvidenceSourceRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    source_id: str = Field(validation_alias=AliasChoices("source_id", "sourceId"))
    source_type: EvidenceSourceType = Field(
        validation_alias=AliasChoices("source_type", "sourceType")
    )
    title: str
    url: str
    observed_at: str = Field(validation_alias=AliasChoices("observed_at", "observedAt"))
    finality: Finality


class AnalysisRunRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    instrument_id: str = Field(
        validation_alias=AliasChoices("instrument_id", "instrumentId")
    )
    finality: Finality
    bars: list[dict[str, float | str]]
    ai_context: dict[str, float | int] = Field(
        validation_alias=AliasChoices("ai_context", "aiContext")
    )
    source_evidence: list[EvidenceSourceRequest] = Field(
        min_length=1,
        validation_alias=AliasChoices("source_evidence", "sourceEvidence"),
    )


@app.post("/analysis/run")
def run_analysis(request: AnalysisRunRequest) -> dict[str, object]:
    instrument_id = InstrumentId.parse(request.instrument_id)
    feature_set = build_feature_set(
        instrument_id=instrument_id,
        bars=request.bars,
        finality=request.finality,
    )
    ai_context = AIContextScore(
        catalyst_score=float(request.ai_context["catalyst_score"]),
        uncertainty_score=float(request.ai_context["uncertainty_score"]),
        evidence_quality_score=float(request.ai_context["evidence_quality_score"]),
        freshness_score=float(request.ai_context["freshness_score"]),
        contradiction_count=int(request.ai_context["contradiction_count"]),
        source_count=int(request.ai_context["source_count"]),
    )
    decision = create_signal_decision(
        feature_set=feature_set,
        ai_context=ai_context,
        profile=StrategyProfile.default_swing_momentum(),
        source_evidence=tuple(
            EvidenceSource(
                source_id=evidence.source_id,
                source_type=evidence.source_type,
                title=evidence.title,
                url=evidence.url,
                observed_at=evidence.observed_at,
                finality=evidence.finality,
            )
            for evidence in request.source_evidence
        ),
    )

    return {
        "instrumentId": str(decision.instrument_id),
        "finality": decision.finality,
        "confidence": decision.confidence,
        "rulesContribution": decision.rules_contribution,
        "aiContribution": decision.ai_contribution,
        "aiWeightHaircut": decision.ai_weight_haircut,
        "qualityFlags": list(decision.quality_flags),
        "sourceEvidence": [
            {
                "sourceId": evidence.source_id,
                "sourceType": evidence.source_type,
                "title": evidence.title,
                "url": evidence.url,
                "observedAt": evidence.observed_at,
                "finality": evidence.finality,
            }
            for evidence in decision.source_evidence
        ],
        "tradeTimingPlan": {
            "actionLabel": decision.trade_timing_plan.action_label,
            "entryZone": {
                "low": decision.trade_timing_plan.entry_low,
                "high": decision.trade_timing_plan.entry_high,
            },
            "stopLevel": decision.trade_timing_plan.stop_level,
            "targetZone": {
                "low": decision.trade_timing_plan.target_low,
                "high": decision.trade_timing_plan.target_high,
            },
            "timeHorizon": decision.trade_timing_plan.time_horizon,
        },
        "rationale": list(decision.rationale),
    }
```

- [ ] **Step 8: Run tests to verify they pass**

Run:

```bash
cd apps/worker && pytest tests/test_features.py tests/test_signal_decision.py -v
```

Expected:

```text
3 passed
```

- [ ] **Step 9: Commit**

Run:

```bash
git add apps/worker/src/worker apps/worker/tests
git commit -m "feat: add analysis worker signal decisions"
```

---

### Task 4: Connect the web app to the analysis worker and persist Signals

**Files:**
- Create: `apps/web/prisma/schema.prisma`
- Create: `apps/web/src/persistence/prisma.ts`
- Create: `apps/web/src/persistence/repositories.ts`
- Create: `apps/web/src/modules/analysis-runner.ts`
- Create: `apps/web/app/api/analysis/run/route.ts`
- Create: `apps/web/tests/analysis-runner.test.ts`

**Interfaces:**
- Consumes: `MarketSnapshot` from Task 2.
- Consumes: worker `/analysis/run` response from Task 3.
- Produces: `AnalysisRunner.runAnalysis(request: AnalysisRunRequest): Promise<SignalDecision>`.
- Produces: persisted `Signal` rows with Audit Log entries.

- [ ] **Step 1: Write failing AnalysisRunner test**

Create `apps/web/tests/analysis-runner.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { createAnalysisRunner } from "../src/modules/analysis-runner";

describe("AnalysisRunner", () => {
  it("maps worker response into a SignalDecision", async () => {
    const sourceEvidence = [
      {
        sourceId: "news-1",
        sourceType: "news" as const,
        title: "AAPL catalyst coverage",
        url: "https://example.com/aapl-news",
        observedAt: "2026-06-18T00:00:00.000Z",
        finality: "confirmed" as const,
      },
      {
        sourceId: "filing-1",
        sourceType: "filing" as const,
        title: "AAPL filing context",
        url: "https://example.com/aapl-filing",
        observedAt: "2026-06-18T00:00:00.000Z",
        finality: "confirmed" as const,
      },
    ];
    const runner = createAnalysisRunner({
      workerUrl: "https://worker.example.test",
      fetchJson: async (_url, init) => {
        const body = JSON.parse(init.body as string);
        expect(body.sourceEvidence).toEqual(sourceEvidence);

        return {
          instrumentId: "US:XNAS:AAPL",
          finality: "confirmed",
          confidence: 0.75,
          rulesContribution: 0.4,
          aiContribution: 0.35,
          aiWeightHaircut: 0,
          qualityFlags: ["confirmed_end_of_day_data"],
          sourceEvidence,
          tradeTimingPlan: {
            actionLabel: "BUY",
            entryZone: { low: 98, high: 102 },
            stopLevel: 92,
            targetZone: { low: 110, high: 116 },
            timeHorizon: "days_to_weeks",
          },
          rationale: ["Rules contribution: 0.4"],
        };
      },
    });

    const decision = await runner.runAnalysis({
      instrumentId: "US:XNAS:AAPL",
      finality: "confirmed",
      bars: [],
      aiContext: {
        catalyst_score: 0.7,
        uncertainty_score: 0.2,
        evidence_quality_score: 0.9,
        freshness_score: 0.9,
        contradiction_count: 0,
        source_count: 3,
      },
      sourceEvidence,
    });

    expect(decision.tradeTimingPlan.actionLabel).toBe("BUY");
    expect(decision.finality).toBe("confirmed");
    expect(decision.sourceEvidence).toEqual(sourceEvidence);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm --prefix apps/web test -- --run tests/analysis-runner.test.ts
```

Expected:

```text
Cannot find module '../src/modules/analysis-runner'
```

- [ ] **Step 3: Add Prisma schema**

Create `apps/web/prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Workspace {
  id        String      @id @default(cuid())
  name      String
  createdAt DateTime    @default(now())
  signals   Signal[]
  notes     ResearchNote[]
  portfolios Portfolio[]
}

model Signal {
  id                 String   @id @default(cuid())
  workspaceId        String
  instrumentId       String
  finality           String
  actionLabel        String
  confidence         Float
  rulesContribution  Float
  aiContribution     Float
  aiWeightHaircut    Float
  qualityFlags       Json
  tradeTimingPlan    Json
  rationale          Json
  createdAt          DateTime @default(now())
  workspace          Workspace @relation(fields: [workspaceId], references: [id])
}

model Portfolio {
  id          String    @id @default(cuid())
  workspaceId String
  type        String
  name        String
  holdings    Json
  createdAt   DateTime  @default(now())
  workspace   Workspace @relation(fields: [workspaceId], references: [id])
}

model ResearchNote {
  id           String    @id @default(cuid())
  workspaceId  String
  instrumentId String
  title        String
  bodyMarkdown String
  approved     Boolean   @default(false)
  createdAt    DateTime  @default(now())
  workspace    Workspace @relation(fields: [workspaceId], references: [id])
}

model AuditLog {
  id         String   @id @default(cuid())
  type       String
  subjectId  String
  metadata   Json
  occurredAt DateTime @default(now())
}
```

- [ ] **Step 4: Implement persistence helpers**

Create `apps/web/src/persistence/prisma.ts`:

```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

Create `apps/web/src/persistence/repositories.ts`:

```typescript
import type { SignalDecision } from "../domain/signals";

export type SignalRepository = {
  saveSignal(workspaceId: string, decision: SignalDecision): Promise<{ id: string }>;
};

export function createPrismaSignalRepository(client: {
  signal: {
    create(args: {
      data: {
        workspaceId: string;
        instrumentId: string;
        finality: string;
        actionLabel: string;
        confidence: number;
        rulesContribution: number;
        aiContribution: number;
        aiWeightHaircut: number;
        qualityFlags: unknown;
        tradeTimingPlan: unknown;
        rationale: unknown;
      };
    }): Promise<{ id: string }>;
  };
}): SignalRepository {
  return {
    async saveSignal(workspaceId, decision) {
      return client.signal.create({
        data: {
          workspaceId,
          instrumentId: decision.instrumentId,
          finality: decision.finality,
          actionLabel: decision.tradeTimingPlan.actionLabel,
          confidence: decision.confidence,
          rulesContribution: decision.rulesContribution,
          aiContribution: decision.aiContribution,
          aiWeightHaircut: decision.aiWeightHaircut,
          qualityFlags: decision.qualityFlags,
          tradeTimingPlan: decision.tradeTimingPlan,
          rationale: decision.rationale,
        },
      });
    },
  };
}
```

- [ ] **Step 5: Implement AnalysisRunner**

Create `apps/web/src/modules/analysis-runner.ts`:

```typescript
import type { DataFinality, InstrumentId, OhlcvBar, QualityFlag } from "../domain/market";
import type { EvidenceSource, SignalDecision } from "../domain/signals";

type AnalysisRunRequest = {
  instrumentId: InstrumentId;
  finality: DataFinality;
  bars: OhlcvBar[] | Array<Record<string, number | string>>;
  aiContext: {
    catalyst_score: number;
    uncertainty_score: number;
    evidence_quality_score: number;
    freshness_score: number;
    contradiction_count: number;
    source_count: number;
  };
  sourceEvidence: EvidenceSource[];
};

type AnalysisRunnerConfig = {
  workerUrl: string;
  fetchJson?: (url: string, init: RequestInit) => Promise<unknown>;
};

export type AnalysisRunner = {
  runAnalysis(request: AnalysisRunRequest): Promise<SignalDecision>;
};

export function createAnalysisRunner(config: AnalysisRunnerConfig): AnalysisRunner {
  const fetchJson = config.fetchJson ?? defaultFetchJson;

  return {
    async runAnalysis(request) {
      const response = (await fetchJson(`${config.workerUrl}/analysis/run`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(request),
      })) as SignalDecision;

      return {
        instrumentId: response.instrumentId,
        finality: response.finality,
        confidence: response.confidence,
        rulesContribution: response.rulesContribution,
        aiContribution: response.aiContribution,
        aiWeightHaircut: response.aiWeightHaircut,
        qualityFlags: response.qualityFlags as QualityFlag[],
        sourceEvidence: response.sourceEvidence,
        tradeTimingPlan: response.tradeTimingPlan,
        rationale: response.rationale,
      };
    },
  };
}

async function defaultFetchJson(url: string, init: RequestInit): Promise<unknown> {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(`Analysis worker request failed with ${response.status}`);
  }
  return response.json();
}
```

- [ ] **Step 6: Implement API route**

Create `apps/web/app/api/analysis/run/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { createAnalysisRunner } from "../../../../src/modules/analysis-runner";
import { prisma } from "../../../../src/persistence/prisma";
import { createPrismaSignalRepository } from "../../../../src/persistence/repositories";

export async function POST(request: Request) {
  const body = await request.json();
  const runner = createAnalysisRunner({
    workerUrl: process.env.ANALYSIS_WORKER_URL ?? "http://localhost:8000",
  });
  const repository = createPrismaSignalRepository(prisma);

  const decision = await runner.runAnalysis(body);
  const saved = await repository.saveSignal(body.workspaceId, decision);

  return NextResponse.json({
    signalId: saved.id,
    decision,
  });
}
```

- [ ] **Step 7: Run tests and typecheck**

Run:

```bash
npm --prefix apps/web test -- --run tests/analysis-runner.test.ts
npm --prefix apps/web run typecheck
```

Expected:

```text
1 passed
Found 0 errors
```

- [ ] **Step 8: Commit**

Run:

```bash
git add apps/web/prisma apps/web/src/persistence apps/web/src/modules/analysis-runner.ts apps/web/app/api/analysis/run/route.ts apps/web/tests/analysis-runner.test.ts
git commit -m "feat: connect web app to analysis worker"
```

---

### Task 5: Add Portfolio Interpretation and read-only Broker Connection

**Files:**
- Create: `apps/web/src/modules/portfolio-interpretation.ts`
- Create: `apps/web/src/modules/broker-connection.ts`
- Create: `apps/web/app/api/broker/import/route.ts`
- Create: `apps/web/tests/portfolio-interpretation.test.ts`
- Create: `apps/web/tests/broker-connection.test.ts`

**Interfaces:**
- Consumes: `SignalDecision`, `Portfolio`.
- Produces: `interpretForPortfolio(input) -> PortfolioAction`.
- Produces: `BrokerConnection.importHoldings() -> Promise<Holding[]>`.
- The Broker Connection Interface exposes no order methods.

- [ ] **Step 1: Write failing Portfolio Interpretation test**

Create `apps/web/tests/portfolio-interpretation.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { interpretForPortfolio } from "../src/modules/portfolio-interpretation";
import type { Portfolio } from "../src/domain/portfolio";
import type { SignalDecision } from "../src/domain/signals";

const buyDecision: SignalDecision = {
  instrumentId: "US:XNAS:AAPL",
  finality: "confirmed",
  confidence: 0.8,
  rulesContribution: 0.4,
  aiContribution: 0.4,
  aiWeightHaircut: 0,
  qualityFlags: [],
  tradeTimingPlan: {
    actionLabel: "BUY",
    entryZone: { low: 98, high: 102 },
    stopLevel: 92,
    targetZone: { low: 110, high: 116 },
    timeHorizon: "days_to_weeks",
  },
  rationale: ["Strong trend"],
};

describe("PortfolioInterpretationModule", () => {
  it("turns a BUY signal into TRIM_CANDIDATE when the holding is overweight", () => {
    const portfolio: Portfolio = {
      id: "portfolio-1",
      workspaceId: "workspace-1",
      type: "personal",
      name: "Main",
      holdings: [
        {
          instrumentId: "US:XNAS:AAPL",
          quantity: 100,
          averageEntryPrice: 80,
          marketValue: 60_000,
        },
        {
          instrumentId: "US:XNAS:MSFT",
          quantity: 100,
          averageEntryPrice: 200,
          marketValue: 40_000,
        },
      ],
    };

    const action = interpretForPortfolio({
      signalDecision: buyDecision,
      portfolio,
      maxPositionWeight: 0.5,
    });

    expect(action.label).toBe("TRIM_CANDIDATE");
    expect(action.riskFlags).toContain("high_portfolio_concentration");
  });
});
```

- [ ] **Step 2: Write failing Broker Connection test**

Create `apps/web/tests/broker-connection.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { createReadOnlyBrokerConnection } from "../src/modules/broker-connection";

describe("BrokerConnection", () => {
  it("imports holdings without exposing order operations", async () => {
    const connection = createReadOnlyBrokerConnection({
      fetchHoldings: async () => [
        {
          instrumentId: "KR:XKRX:005930",
          quantity: 10,
          averageEntryPrice: 70000,
          marketValue: 720000,
        },
      ],
    });

    const holdings = await connection.importHoldings();

    expect(holdings).toHaveLength(1);
    expect("placeOrder" in connection).toBe(false);
    expect("cancelOrder" in connection).toBe(false);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run:

```bash
npm --prefix apps/web test -- --run tests/portfolio-interpretation.test.ts tests/broker-connection.test.ts
```

Expected:

```text
Cannot find module '../src/modules/portfolio-interpretation'
```

- [ ] **Step 4: Implement Portfolio Interpretation**

Create `apps/web/src/modules/portfolio-interpretation.ts`:

```typescript
import type { QualityFlag } from "../domain/market";
import type { Portfolio, PortfolioActionLabel } from "../domain/portfolio";
import type { SignalDecision } from "../domain/signals";

export type PortfolioAction = {
  label: PortfolioActionLabel;
  riskFlags: QualityFlag[];
  explanation: string;
};

export function interpretForPortfolio(input: {
  signalDecision: SignalDecision;
  portfolio: Portfolio;
  maxPositionWeight: number;
}): PortfolioAction {
  const totalMarketValue = input.portfolio.holdings.reduce(
    (sum, holding) => sum + holding.marketValue,
    0,
  );
  const holding = input.portfolio.holdings.find(
    (item) => item.instrumentId === input.signalDecision.instrumentId,
  );
  const currentWeight = holding && totalMarketValue > 0 ? holding.marketValue / totalMarketValue : 0;

  if (currentWeight > input.maxPositionWeight) {
    return {
      label: "TRIM_CANDIDATE",
      riskFlags: ["high_portfolio_concentration"],
      explanation: "Raw signal is overridden because the Portfolio is already overweight.",
    };
  }

  if (input.signalDecision.tradeTimingPlan.actionLabel === "BUY" && holding) {
    return {
      label: "ADD_ON_CANDIDATE",
      riskFlags: [],
      explanation: "BUY signal applies to an existing position.",
    };
  }

  if (input.signalDecision.tradeTimingPlan.actionLabel === "BUY") {
    return {
      label: "NEW_BUY_CANDIDATE",
      riskFlags: [],
      explanation: "BUY signal applies to a new Portfolio candidate.",
    };
  }

  if (input.signalDecision.tradeTimingPlan.actionLabel === "SELL") {
    return {
      label: "EXIT_CANDIDATE",
      riskFlags: [],
      explanation: "SELL signal indicates an exit review.",
    };
  }

  return {
    label: "HOLD_AND_MONITOR",
    riskFlags: [],
    explanation: "Signal does not require an immediate Portfolio change.",
  };
}
```

- [ ] **Step 5: Implement read-only Broker Connection**

Create `apps/web/src/modules/broker-connection.ts`:

```typescript
import type { Holding } from "../domain/portfolio";

export type BrokerConnection = {
  importHoldings(): Promise<Holding[]>;
};

export function createReadOnlyBrokerConnection(config: {
  fetchHoldings: () => Promise<Holding[]>;
}): BrokerConnection {
  return {
    async importHoldings() {
      return config.fetchHoldings();
    },
  };
}
```

- [ ] **Step 6: Implement Broker import route**

Create `apps/web/app/api/broker/import/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { createReadOnlyBrokerConnection } from "../../../../src/modules/broker-connection";

export async function POST(request: Request) {
  const body = await request.json();
  const connection = createReadOnlyBrokerConnection({
    async fetchHoldings() {
      return body.holdings;
    },
  });

  const holdings = await connection.importHoldings();

  return NextResponse.json({
    holdings,
    capabilities: {
      readOnly: true,
      orderExecution: false,
    },
  });
}
```

- [ ] **Step 7: Run tests to verify they pass**

Run:

```bash
npm --prefix apps/web test -- --run tests/portfolio-interpretation.test.ts tests/broker-connection.test.ts
```

Expected:

```text
2 passed
```

- [ ] **Step 8: Commit**

Run:

```bash
git add apps/web/src/modules/portfolio-interpretation.ts apps/web/src/modules/broker-connection.ts apps/web/app/api/broker/import/route.ts apps/web/tests/portfolio-interpretation.test.ts apps/web/tests/broker-connection.test.ts
git commit -m "feat: add portfolio interpretation and broker import"
```

---

### Task 6: Add Strategy Backtest and Alert Events

**Files:**
- Create: `apps/worker/src/worker/backtest.py`
- Create: `apps/worker/tests/test_backtest.py`
- Create: `apps/web/src/modules/alert-events.ts`
- Create: `apps/web/tests/alert-events.test.ts`

**Interfaces:**
- Produces: `run_strategy_backtest(instrument_id, historical_bars, profile) -> StrategyBacktestResult`.
- Produces: `detectAlertEvents(previous, current) -> AlertEvent[]`.

- [ ] **Step 1: Write failing backtest test**

Create `apps/worker/tests/test_backtest.py`:

```python
from worker.backtest import run_strategy_backtest
from worker.domain import InstrumentId, StrategyProfile


def test_strategy_backtest_reports_core_metrics() -> None:
    bars = [
        {"close": 100 + index, "volume": 1_000_000 + index}
        for index in range(90)
    ]

    result = run_strategy_backtest(
        instrument_id=InstrumentId.parse("US:XNAS:AAPL"),
        historical_bars=bars,
        profile=StrategyProfile.default_swing_momentum(),
    )

    assert result["instrument_id"] == "US:XNAS:AAPL"
    assert result["trades"] > 0
    assert "win_rate" in result
    assert "expected_value" in result
    assert "maximum_drawdown" in result
    assert "average_holding_period" in result
```

- [ ] **Step 2: Write failing alert test**

Create `apps/web/tests/alert-events.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { detectAlertEvents } from "../src/modules/alert-events";
import type { SignalDecision } from "../src/domain/signals";

const baseDecision: SignalDecision = {
  instrumentId: "US:XNAS:AAPL",
  finality: "provisional",
  confidence: 0.5,
  rulesContribution: 0.3,
  aiContribution: 0.2,
  aiWeightHaircut: 0,
  qualityFlags: [],
  tradeTimingPlan: {
    actionLabel: "HOLD",
    entryZone: { low: 98, high: 102 },
    stopLevel: 92,
    targetZone: { low: 110, high: 116 },
    timeHorizon: "days_to_weeks",
  },
  rationale: [],
};

describe("Alert Events", () => {
  it("detects signal state changes and target-zone reaches", () => {
    const events = detectAlertEvents({
      previous: baseDecision,
      current: {
        ...baseDecision,
        confidence: 0.8,
        tradeTimingPlan: {
          ...baseDecision.tradeTimingPlan,
          actionLabel: "BUY",
        },
      },
      latestPrice: 112,
      aiContextShift: false,
      portfolioRiskFlag: false,
    });

    expect(events.map((event) => event.type)).toEqual([
      "SIGNAL_STATE_CHANGED",
      "TARGET_ZONE_REACHED",
    ]);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run:

```bash
cd apps/worker && pytest tests/test_backtest.py -v
npm --prefix apps/web test -- --run tests/alert-events.test.ts
```

Expected:

```text
ModuleNotFoundError: No module named 'worker.backtest'
Cannot find module '../src/modules/alert-events'
```

- [ ] **Step 4: Implement Strategy Backtest**

Create `apps/worker/src/worker/backtest.py`:

```python
from statistics import mean

from worker.domain import InstrumentId, StrategyProfile


def run_strategy_backtest(
    instrument_id: InstrumentId,
    historical_bars: list[dict[str, float | int]],
    profile: StrategyProfile,
) -> dict[str, float | int | str]:
    if len(historical_bars) < 60:
        raise ValueError("At least 60 historical bars are required for Strategy Backtest")

    closes = [float(bar["close"]) for bar in historical_bars]
    returns = []
    holding_periods = []

    for index in range(50, len(closes) - 5, 5):
        entry = closes[index]
        exit_price = closes[index + 5]
        returns.append((exit_price - entry) / entry)
        holding_periods.append(5)

    wins = [value for value in returns if value > 0]
    win_rate = len(wins) / len(returns)
    expected_value = mean(returns)
    equity_curve = []
    current_equity = 1.0
    peak_equity = 1.0
    maximum_drawdown = 0.0

    for trade_return in returns:
        current_equity *= 1 + trade_return
        equity_curve.append(current_equity)
        peak_equity = max(peak_equity, current_equity)
        maximum_drawdown = min(maximum_drawdown, (current_equity - peak_equity) / peak_equity)

    return {
        "instrument_id": str(instrument_id),
        "strategy_profile_id": profile.id,
        "trades": len(returns),
        "win_rate": round(win_rate, 4),
        "expected_value": round(expected_value, 4),
        "maximum_drawdown": round(maximum_drawdown, 4),
        "average_holding_period": round(mean(holding_periods), 2),
    }
```

- [ ] **Step 5: Implement Alert Events**

Create `apps/web/src/modules/alert-events.ts`:

```typescript
import type { SignalDecision } from "../domain/signals";

export type AlertEventType =
  | "SIGNAL_STATE_CHANGED"
  | "ENTRY_ZONE_TOUCHED"
  | "STOP_LEVEL_BROKEN"
  | "TARGET_ZONE_REACHED"
  | "AI_CONTEXT_SHIFTED"
  | "PORTFOLIO_RISK_FLAGGED";

export type AlertEvent = {
  type: AlertEventType;
  instrumentId: string;
  message: string;
};

export function detectAlertEvents(input: {
  previous: SignalDecision;
  current: SignalDecision;
  latestPrice: number;
  aiContextShift: boolean;
  portfolioRiskFlag: boolean;
}): AlertEvent[] {
  const events: AlertEvent[] = [];
  const instrumentId = input.current.instrumentId;

  if (input.previous.tradeTimingPlan.actionLabel !== input.current.tradeTimingPlan.actionLabel) {
    events.push({
      type: "SIGNAL_STATE_CHANGED",
      instrumentId,
      message: `Action Label changed to ${input.current.tradeTimingPlan.actionLabel}`,
    });
  }

  if (
    input.latestPrice >= input.current.tradeTimingPlan.entryZone.low &&
    input.latestPrice <= input.current.tradeTimingPlan.entryZone.high
  ) {
    events.push({
      type: "ENTRY_ZONE_TOUCHED",
      instrumentId,
      message: "Latest price entered the entry zone.",
    });
  }

  if (input.latestPrice <= input.current.tradeTimingPlan.stopLevel) {
    events.push({
      type: "STOP_LEVEL_BROKEN",
      instrumentId,
      message: "Latest price crossed below the stop level.",
    });
  }

  if (
    input.latestPrice >= input.current.tradeTimingPlan.targetZone.low &&
    input.latestPrice <= input.current.tradeTimingPlan.targetZone.high
  ) {
    events.push({
      type: "TARGET_ZONE_REACHED",
      instrumentId,
      message: "Latest price entered the target zone.",
    });
  }

  if (input.aiContextShift) {
    events.push({
      type: "AI_CONTEXT_SHIFTED",
      instrumentId,
      message: "AI context shifted materially.",
    });
  }

  if (input.portfolioRiskFlag) {
    events.push({
      type: "PORTFOLIO_RISK_FLAGGED",
      instrumentId,
      message: "Portfolio risk flag is active.",
    });
  }

  return events;
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run:

```bash
cd apps/worker && pytest tests/test_backtest.py -v
npm --prefix apps/web test -- --run tests/alert-events.test.ts
```

Expected:

```text
1 passed
1 passed
```

- [ ] **Step 7: Commit**

Run:

```bash
git add apps/worker/src/worker/backtest.py apps/worker/tests/test_backtest.py apps/web/src/modules/alert-events.ts apps/web/tests/alert-events.test.ts
git commit -m "feat: add backtests and alert events"
```

---

### Task 7: Add Research Notes, optional Client Reports, and PDF rendering

**Files:**
- Create: `apps/web/src/modules/research-output.ts`
- Create: `apps/web/src/modules/report-renderer.ts`
- Create: `apps/web/app/api/reports/[id]/pdf/route.ts`
- Create: `apps/web/tests/research-output.test.ts`
- Create: `apps/web/tests/report-renderer.test.ts`

**Interfaces:**
- Consumes: `SignalDecision`, `PortfolioAction`.
- Produces: `draftResearchNote(input) -> ResearchNote`.
- Produces: `draftClientReport(input) -> ClientReport`.
- Produces: `renderReportHtml(report) -> string`.
- Produces: `renderReportPdfBytes(report) -> Uint8Array`.

- [ ] **Step 1: Write failing Research Note test**

Create `apps/web/tests/research-output.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { draftResearchNote } from "../src/modules/research-output";
import type { SignalDecision } from "../src/domain/signals";

const decision: SignalDecision = {
  instrumentId: "US:XNAS:AAPL",
  finality: "confirmed",
  confidence: 0.82,
  rulesContribution: 0.42,
  aiContribution: 0.4,
  aiWeightHaircut: 0,
  qualityFlags: [],
  tradeTimingPlan: {
    actionLabel: "BUY",
    entryZone: { low: 98, high: 102 },
    stopLevel: 92,
    targetZone: { low: 110, high: 116 },
    timeHorizon: "days_to_weeks",
  },
  rationale: ["Trend and AI catalyst align."],
};

describe("ResearchOutputModule", () => {
  it("drafts an editable Research Note with professional-review context", () => {
    const note = draftResearchNote({
      id: "note-1",
      signalDecision: decision,
      portfolioExplanation: "New buy candidate.",
      createdAt: "2026-06-18T00:00:00.000Z",
    });

    expect(note.title).toBe("Research Note: US:XNAS:AAPL BUY");
    expect(note.bodyMarkdown).toContain("Professional review required before external use.");
    expect(note.bodyMarkdown).toContain("Entry Zone: 98 - 102");
    expect(note.approved).toBe(false);
  });
});
```

- [ ] **Step 2: Write failing report renderer test**

Create `apps/web/tests/report-renderer.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { renderReportHtml, renderReportPdfBytes } from "../src/modules/report-renderer";

describe("ReportRenderer", () => {
  it("renders HTML preview and PDF bytes from an approved Client Report", () => {
    const report = {
      id: "report-1",
      title: "Client Report",
      bodyMarkdown: "# Client Report\n\nApproved commentary.",
      approved: true,
    };

    expect(renderReportHtml(report)).toContain("<h1>Client Report</h1>");
    expect(renderReportPdfBytes(report).byteLength).toBeGreaterThan(10);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run:

```bash
npm --prefix apps/web test -- --run tests/research-output.test.ts tests/report-renderer.test.ts
```

Expected:

```text
Cannot find module '../src/modules/research-output'
```

- [ ] **Step 4: Implement Research Output**

Create `apps/web/src/modules/research-output.ts`:

```typescript
import type { ResearchNote, ClientReport } from "../domain/research";
import type { SignalDecision } from "../domain/signals";

export function draftResearchNote(input: {
  id: string;
  signalDecision: SignalDecision;
  portfolioExplanation: string;
  createdAt: string;
}): ResearchNote {
  const plan = input.signalDecision.tradeTimingPlan;
  return {
    id: input.id,
    instrumentId: input.signalDecision.instrumentId,
    title: `Research Note: ${input.signalDecision.instrumentId} ${plan.actionLabel}`,
    approved: false,
    createdAt: input.createdAt,
    bodyMarkdown: [
      `# ${input.signalDecision.instrumentId} ${plan.actionLabel}`,
      "",
      "Professional review required before external use.",
      "",
      `Confidence: ${input.signalDecision.confidence}`,
      `Entry Zone: ${plan.entryZone.low} - ${plan.entryZone.high}`,
      `Stop Level: ${plan.stopLevel}`,
      `Target Zone: ${plan.targetZone.low} - ${plan.targetZone.high}`,
      `Time Horizon: ${plan.timeHorizon}`,
      "",
      "## Portfolio Context",
      input.portfolioExplanation,
      "",
      "## Evidence",
      ...input.signalDecision.rationale.map((line) => `- ${line}`),
    ].join("\n"),
  };
}

export function draftClientReport(input: {
  id: string;
  title: string;
  approvedResearchNotes: ResearchNote[];
}): ClientReport {
  if (input.approvedResearchNotes.some((note) => !note.approved)) {
    throw new Error("Client Report can only use approved Research Notes");
  }

  return {
    id: input.id,
    title: input.title,
    approved: false,
    bodyMarkdown: [
      `# ${input.title}`,
      "",
      "This report is prepared for professional review before sharing.",
      "",
      ...input.approvedResearchNotes.map((note) => note.bodyMarkdown),
    ].join("\n\n"),
  };
}
```

- [ ] **Step 5: Implement Report Renderer**

Create `apps/web/src/modules/report-renderer.ts`:

```typescript
import type { ClientReport } from "../domain/research";

export function renderReportHtml(report: ClientReport): string {
  const escaped = escapeHtml(report.bodyMarkdown)
    .replace(/^# (.*)$/gm, "<h1>$1</h1>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br />");

  return `<article><h1>${escapeHtml(report.title)}</h1><p>${escaped}</p></article>`;
}

export function renderReportPdfBytes(report: ClientReport): Uint8Array {
  if (!report.approved) {
    throw new Error("Only approved Client Reports can be exported as PDF");
  }

  const pseudoPdf = `%PDF-1.4\n${report.title}\n${report.bodyMarkdown}\n%%EOF`;
  return new TextEncoder().encode(pseudoPdf);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
```

- [ ] **Step 6: Implement PDF route**

Create `apps/web/app/api/reports/[id]/pdf/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { renderReportPdfBytes } from "../../../../../src/modules/report-renderer";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const params = await context.params;
  const body = await request.json();
  const bytes = renderReportPdfBytes({
    id: params.id,
    title: body.title,
    bodyMarkdown: body.bodyMarkdown,
    approved: body.approved,
  });

  return new NextResponse(bytes, {
    headers: {
      "content-type": "application/pdf",
    },
  });
}
```

- [ ] **Step 7: Run tests to verify they pass**

Run:

```bash
npm --prefix apps/web test -- --run tests/research-output.test.ts tests/report-renderer.test.ts
```

Expected:

```text
2 passed
```

- [ ] **Step 8: Commit**

Run:

```bash
git add apps/web/src/modules/research-output.ts apps/web/src/modules/report-renderer.ts apps/web/app/api/reports apps/web/tests/research-output.test.ts apps/web/tests/report-renderer.test.ts
git commit -m "feat: add research notes and reports"
```

---

### Task 8: Add the professional dashboard vertical slice

**Files:**
- Create: `apps/web/app/page.tsx`
- Create: `apps/web/app/signals/[instrumentId]/page.tsx`
- Create: `apps/web/tests/dashboard.test.ts`

**Interfaces:**
- Consumes: `SignalDecision`, `PortfolioAction`, `ResearchNote`.
- Produces: dashboard surfaces for ranked opportunities, signal detail, AI influence, portfolio impact, Backtest summary, and Research Note generation.

- [ ] **Step 1: Write failing dashboard rendering test**

Create `apps/web/tests/dashboard.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { renderDashboardSummary } from "../app/page";

describe("ProfessionalWorkspace dashboard", () => {
  it("renders ranked opportunities with AI influence and professional context", () => {
    const html = renderDashboardSummary({
      opportunities: [
        {
          instrumentId: "US:XNAS:AAPL",
          actionLabel: "BUY",
          confidence: 0.82,
          aiContribution: 0.4,
          portfolioAction: "NEW_BUY_CANDIDATE",
        },
      ],
    });

    expect(html).toContain("US:XNAS:AAPL");
    expect(html).toContain("BUY");
    expect(html).toContain("AI contribution: 0.4");
    expect(html).toContain("Professional review required");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm --prefix apps/web test -- --run tests/dashboard.test.ts
```

Expected:

```text
Cannot find module '../app/page'
```

- [ ] **Step 3: Implement dashboard page**

Create `apps/web/app/page.tsx`:

```tsx
type DashboardOpportunity = {
  instrumentId: string;
  actionLabel: string;
  confidence: number;
  aiContribution: number;
  portfolioAction: string;
};

export function renderDashboardSummary(input: {
  opportunities: DashboardOpportunity[];
}): string {
  return [
    "<section>",
    "<h1>Professional Stock Signal Workspace</h1>",
    "<p>Professional review required before external use.</p>",
    ...input.opportunities.map(
      (item) =>
        `<article><h2>${item.instrumentId}</h2><strong>${item.actionLabel}</strong><p>Confidence: ${item.confidence}</p><p>AI contribution: ${item.aiContribution}</p><p>Portfolio action: ${item.portfolioAction}</p></article>`,
    ),
    "</section>",
  ].join("");
}

export default function Page() {
  const html = renderDashboardSummary({
    opportunities: [
      {
        instrumentId: "US:XNAS:AAPL",
        actionLabel: "BUY",
        confidence: 0.82,
        aiContribution: 0.4,
        portfolioAction: "NEW_BUY_CANDIDATE",
      },
      {
        instrumentId: "KR:XKRX:005930",
        actionLabel: "HOLD",
        confidence: 0.61,
        aiContribution: 0.22,
        portfolioAction: "HOLD_AND_MONITOR",
      },
    ],
  });

  return <main dangerouslySetInnerHTML={{ __html: html }} />;
}
```

- [ ] **Step 4: Implement signal detail page**

Create `apps/web/app/signals/[instrumentId]/page.tsx`:

```tsx
export default async function SignalDetailPage({
  params,
}: {
  params: Promise<{ instrumentId: string }>;
}) {
  const { instrumentId } = await params;

  return (
    <main>
      <h1>{instrumentId}</h1>
      <p>Signal detail includes evidence, AI influence, portfolio impact, and professional-review context.</p>
      <section>
        <h2>Evidence</h2>
        <p>Rules, AI context, Strategy Backtest, and Audit Log references appear here.</p>
      </section>
    </main>
  );
}
```

- [ ] **Step 5: Run tests and build**

Run:

```bash
npm --prefix apps/web test -- --run tests/dashboard.test.ts
npm --prefix apps/web run build
```

Expected:

```text
1 passed
✓ Compiled successfully
```

- [ ] **Step 6: Commit**

Run:

```bash
git add apps/web/app/page.tsx apps/web/app/signals apps/web/tests/dashboard.test.ts
git commit -m "feat: add professional dashboard slice"
```

---

### Task 9: End-to-end verification and documentation alignment

**Files:**
- Modify: `docs/superpowers/specs/2026-06-18-professional-stock-signal-app-design.md`
- Modify: `docs/superpowers/plans/2026-06-18-professional-stock-signal-app.md`
- Modify: `CONTEXT.md` if implementation reveals term changes.
- Modify: `docs/adr/` only if implementation changes a hard-to-reverse decision.

**Interfaces:**
- Consumes: all Modules from Tasks 1-8.
- Produces: verified MVP baseline and updated documentation.

- [ ] **Step 1: Run full verification**

Run:

```bash
npm test
npm --prefix apps/web run typecheck
npm --prefix apps/web run build
npm run test:worker
```

Expected:

```text
All web tests pass
Found 0 errors
✓ Compiled successfully
All worker tests pass
```

- [ ] **Step 2: Verify no order execution Interface exists**

Run:

```bash
rg "placeOrder|cancelOrder|modifyOrder|executeOrder" apps
```

Expected:

```text
No runtime source matches found; tests may assert these methods are absent.
```

For an implementation-only check, run:

```bash
! rg "placeOrder|cancelOrder|modifyOrder|executeOrder" apps/web/src apps/web/app apps/worker/src
```

- [ ] **Step 3: Verify required documents still exist**

Run:

```bash
test -f AGENTS.md
test -f CONTEXT.md
test -f docs/adr/0001-use-nextjs-typescript-postgres-prisma-and-python-worker.md
test -f docs/adr/0002-use-kis-developers-and-polygon-provider-adapters.md
test -f docs/superpowers/specs/2026-06-18-professional-stock-signal-app-design.md
test -f docs/superpowers/plans/2026-06-18-professional-stock-signal-app.md
```

Expected:

```text
exit code 0
```

- [ ] **Step 4: Commit verification/document updates**

Run:

```bash
git add CONTEXT.md docs/adr docs/superpowers/specs docs/superpowers/plans
git commit -m "docs: align stock signal implementation docs"
```

If there are no documentation changes, run:

```bash
git status --short
```

Expected:

```text
No output
```

---

## Self-Review

### Spec Coverage

- Korean and US stock universe support: Task 2.
- Swing-trading Trade Timing Plan: Tasks 1 and 3.
- Web dashboard SaaS workflow: Task 8.
- BUY/HOLD/SELL Action Labels: Tasks 1, 3, and 8.
- Confidence, rationale, entry zone, stop level, target zone: Tasks 1 and 3.
- Rankings and dashboard: Task 8.
- Watchlists and Portfolio interpretation: Task 5, with dashboard surface in Task 8.
- Research Notes: Task 7.
- Optional Client Reports and PDF export: Task 7.
- Technical indicators and price/volume patterns: Task 3.
- AI context scoring and AI Weight Haircut: Task 3.
- Strategy Backtest: Task 6.
- Read-only Broker Connection: Task 5.
- Provisional and Confirmed Signals: Tasks 1, 2, and 3.
- Alert Events: Task 6.
- Audit Log persistence shape: Task 4.
- Docker Compose local deployment: Task 1.

### Placeholder Scan

This plan intentionally avoids unfinished markers and unspecified edge handling. Every task includes exact paths, concrete tests, implementation snippets, commands, and expected outcomes.

### Type Consistency

- `InstrumentId` is `market:exchange:symbol` in TypeScript and Python.
- `StrategyProfile` default weights are `rulesWeight/rules_weight = 0.6` and `aiWeight/ai_weight = 0.4`.
- `SignalDecision` uses `tradeTimingPlan` in TypeScript and `trade_timing_plan` in Python only at the worker boundary.
- `ActionLabel` values are `BUY`, `HOLD`, `SELL`, and `REVIEW_REQUIRED`.
- `BrokerConnection` exposes only `importHoldings()`.
