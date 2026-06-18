import pytest
from worker.ai_context import apply_ai_weight_haircut
from worker.app import AnalysisRunRequest, app, run_analysis
from worker.domain import (
    AIContextScore,
    EvidenceSource,
    FeatureSet,
    InstrumentId,
    StrategyProfile,
)
from worker.signal_decision import create_signal_decision
from pydantic import ValidationError


def source_evidence_payload() -> dict[str, str]:
    return {
        "source_id": "news-1",
        "source_type": "news",
        "title": "AAPL catalyst coverage",
        "url": "https://example.com/aapl-news",
        "observed_at": "2026-06-18T00:00:00.000Z",
        "finality": "confirmed",
    }


def source_evidence() -> EvidenceSource:
    return EvidenceSource(**source_evidence_payload())  # type: ignore[arg-type]


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
        source_evidence=(source_evidence(),),
    )

    assert decision.trade_timing_plan.action_label == "BUY"
    assert decision.trade_timing_plan.entry_low == 98.0
    assert decision.trade_timing_plan.entry_high == 102.0
    assert decision.trade_timing_plan.stop_level == 92.0
    assert decision.trade_timing_plan.target_low == 110.0
    assert decision.trade_timing_plan.target_high == 116.0
    assert decision.ai_weight_haircut == 0
    assert decision.finality == "confirmed"


def test_create_signal_decision_rejects_ai_context_without_source_evidence() -> None:
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

    with pytest.raises(ValueError, match="source evidence"):
        create_signal_decision(
            feature_set=feature_set,
            ai_context=ai_context,
            profile=StrategyProfile.default_swing_momentum(),
        )


def test_create_signal_decision_rejects_zero_source_ai_contribution_without_evidence() -> None:
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
        catalyst_score=1.0,
        uncertainty_score=0.0,
        evidence_quality_score=0.9,
        freshness_score=0.9,
        contradiction_count=0,
        source_count=0,
    )

    with pytest.raises(ValueError, match="source evidence"):
        create_signal_decision(
            feature_set=feature_set,
            ai_context=ai_context,
            profile=StrategyProfile.default_swing_momentum(),
        )


def test_analysis_run_route_returns_signal_decision_payload() -> None:
    instrument_id = "US:XNAS:AAPL"
    bars = [
        {
            "instrument_id": instrument_id,
            "close": 100 + index,
            "volume": 1_000_000 + (index * 10_000),
        }
        for index in range(60)
    ]

    assert any(
        route.path == "/analysis/run" and "POST" in route.methods
        for route in app.routes
        if hasattr(route, "methods")
    )
    body = run_analysis(
        AnalysisRunRequest(
            instrument_id=instrument_id,
            finality="confirmed",
            bars=bars,
            ai_context={
                "catalyst_score": 0.7,
                "uncertainty_score": 0.2,
                "evidence_quality_score": 0.9,
                "freshness_score": 0.9,
                "contradiction_count": 0,
                "source_count": 3,
            },
            source_evidence=[source_evidence_payload()],
        )
    )

    assert body["instrumentId"] == instrument_id
    assert body["finality"] == "confirmed"
    assert body["sourceEvidence"] == [
        {
            "sourceId": "news-1",
            "sourceType": "news",
            "title": "AAPL catalyst coverage",
            "url": "https://example.com/aapl-news",
            "observedAt": "2026-06-18T00:00:00.000Z",
            "finality": "confirmed",
        }
    ]
    assert body["tradeTimingPlan"]["actionLabel"] == "BUY"
    assert body["tradeTimingPlan"]["entryZone"]["low"] == 155.82
    assert body["tradeTimingPlan"]["entryZone"]["high"] == 162.18


def test_analysis_run_request_rejects_invalid_finality() -> None:
    with pytest.raises(ValidationError):
        AnalysisRunRequest(
            instrument_id="US:XNAS:AAPL",
            finality="bogus",
            bars=[],
            ai_context={
                "catalyst_score": 0.7,
                "uncertainty_score": 0.2,
                "evidence_quality_score": 0.9,
                "freshness_score": 0.9,
                "contradiction_count": 0,
                "source_count": 3,
            },
            source_evidence=[],
        )
