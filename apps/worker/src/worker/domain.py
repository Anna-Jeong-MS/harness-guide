"""Worker domain models use Python snake_case internally.

The FastAPI boundary will map these models to the TypeScript camelCase response
fields, such as tradeTimingPlan, in later tasks.
"""

from dataclasses import dataclass
import re
from typing import Literal


Market = Literal["KR", "US"]
Exchange = Literal["XKRX", "XKOSDAQ", "XNYS", "XNAS"]
Finality = Literal["provisional", "confirmed"]
ActionLabel = Literal["BUY", "HOLD", "SELL", "REVIEW_REQUIRED"]
EvidenceSourceType = Literal["price", "disclosure", "news", "filing", "research"]


@dataclass(frozen=True)
class InstrumentId:
    market: Market
    exchange: Exchange
    symbol: str

    def __post_init__(self) -> None:
        if self.market not in ("KR", "US"):
            raise ValueError(f"Invalid InstrumentId market: {self.market}")
        if self.exchange not in ("XKRX", "XKOSDAQ", "XNYS", "XNAS"):
            raise ValueError(f"Invalid InstrumentId exchange: {self.exchange}")
        if not self.symbol:
            raise ValueError("InstrumentId symbol must not be empty")
        if ":" in self.symbol:
            raise ValueError("InstrumentId symbol must not contain ':'")

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
class EvidenceSource:
    source_id: str
    source_type: EvidenceSourceType
    title: str
    url: str
    observed_at: str
    finality: Finality


@dataclass(frozen=True)
class SignalDecision:
    instrument_id: InstrumentId
    finality: Finality
    confidence: float
    rules_contribution: float
    ai_contribution: float
    ai_weight_haircut: float
    quality_flags: tuple[str, ...]
    source_evidence: tuple[EvidenceSource, ...]
    trade_timing_plan: TradeTimingPlan
    rationale: tuple[str, ...]


def canonical_source_evidence_key(source: object) -> tuple[str, str] | None:
    source_id = str(getattr(source, "source_id", "") or "").strip()
    if source_id:
        return ("source_id", source_id)

    url = str(getattr(source, "url", "") or "").strip().rstrip("/").casefold()
    title = re.sub(
        r"\s+",
        " ",
        str(getattr(source, "title", "") or "").strip(),
    ).casefold()
    if not url or not title:
        return None
    return ("url_title", f"{url}|{title}")


def distinct_source_evidence_count(sources: tuple[object, ...] | list[object]) -> int:
    return len(
        {
            key
            for source in sources
            if (key := canonical_source_evidence_key(source)) is not None
        }
    )
