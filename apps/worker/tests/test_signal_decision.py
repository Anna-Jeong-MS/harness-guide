import asyncio
import json

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


def post_json(path: str, payload: dict[str, object]) -> tuple[int, dict[str, object]]:
    async def call_app() -> tuple[int, dict[str, object]]:
        request_body = json.dumps(payload).encode()
        messages: list[dict[str, object]] = []
        request_sent = False

        async def receive() -> dict[str, object]:
            nonlocal request_sent
            if request_sent:
                return {"type": "http.disconnect"}
            request_sent = True
            return {
                "type": "http.request",
                "body": request_body,
                "more_body": False,
            }

        async def send(message: dict[str, object]) -> None:
            messages.append(message)

        await app(
            {
                "type": "http",
                "asgi": {"version": "3.0", "spec_version": "2.3"},
                "http_version": "1.1",
                "method": "POST",
                "scheme": "http",
                "path": path,
                "raw_path": path.encode(),
                "query_string": b"",
                "headers": [(b"content-type", b"application/json")],
                "client": ("testclient", 50000),
                "server": ("testserver", 80),
            },
            receive,
            send,
        )

        status = next(
            message["status"]
            for message in messages
            if message["type"] == "http.response.start"
        )
        body = b"".join(
            message.get("body", b"")
            for message in messages
            if message["type"] == "http.response.body"
        )
        return int(status), json.loads(body or b"{}")

    return asyncio.run(call_app())


def source_evidence_payload(source_id: str = "news-1") -> dict[str, str]:
    return {
        "source_id": source_id,
        "source_type": "news",
        "title": "AAPL catalyst coverage",
        "url": "https://example.com/aapl-news",
        "observed_at": "2026-06-18T00:00:00.000Z",
        "finality": "confirmed",
    }


def source_evidence_camel_payload(source_id: str = "news-1") -> dict[str, str]:
    return {
        "sourceId": source_id,
        "sourceType": "news",
        "title": "AAPL catalyst coverage",
        "url": "https://example.com/aapl-news",
        "observedAt": "2026-06-18T00:00:00.000Z",
        "finality": "confirmed",
    }


def analysis_run_camel_payload(
    source_evidence: list[dict[str, str]] | None = None,
) -> dict[str, object]:
    instrument_id = "US:XNAS:AAPL"
    return {
        "instrumentId": instrument_id,
        "finality": "confirmed",
        "bars": [
            {
                "instrument_id": instrument_id,
                "close": 100 + index,
                "volume": 1_000_000 + (index * 10_000),
            }
            for index in range(60)
        ],
        "aiContext": {
            "catalyst_score": 0.7,
            "uncertainty_score": 0.2,
            "evidence_quality_score": 0.9,
            "freshness_score": 0.9,
            "contradiction_count": 0,
            "source_count": 3,
        },
        "sourceEvidence": source_evidence
        if source_evidence is not None
        else [
            source_evidence_camel_payload("news-1"),
            source_evidence_camel_payload("news-2"),
        ],
    }


def source_evidence(source_id: str = "news-1") -> EvidenceSource:
    return EvidenceSource(**source_evidence_payload(source_id))  # type: ignore[arg-type]


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
        source_evidence=(source_evidence("news-1"), source_evidence("news-2")),
    )

    assert decision.trade_timing_plan.action_label == "BUY"
    assert decision.trade_timing_plan.entry_low == 98.0
    assert decision.trade_timing_plan.entry_high == 102.0
    assert decision.trade_timing_plan.stop_level == 92.0
    assert decision.trade_timing_plan.target_low == 110.0
    assert decision.trade_timing_plan.target_high == 116.0
    assert decision.ai_weight_haircut == 0
    assert decision.finality == "confirmed"


def test_create_signal_decision_haircuts_when_displayed_source_evidence_is_insufficient() -> None:
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

    assert decision.ai_weight_haircut == 0.25
    assert decision.ai_contribution == 0.075
    assert "weak_ai_source_evidence" in decision.quality_flags


def test_create_signal_decision_haircuts_duplicate_source_evidence() -> None:
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
        source_evidence=(source_evidence("news-1"), source_evidence("news-1")),
    )

    assert decision.ai_weight_haircut == 0.25
    assert decision.ai_contribution == 0.075
    assert "weak_ai_source_evidence" in decision.quality_flags


def test_create_signal_decision_haircuts_sources_without_ids_by_url_title() -> None:
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
        source_evidence=(source_evidence(""), source_evidence("")),
    )

    assert decision.ai_weight_haircut == 0.25
    assert "weak_ai_source_evidence" in decision.quality_flags


def test_create_signal_decision_haircuts_sources_without_valid_fallback_identity() -> None:
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
        source_evidence=(
            EvidenceSource(
                source_id="",
                source_type="news",
                title="AAPL catalyst coverage",
                url="",
                observed_at="2026-06-18T00:00:00.000Z",
                finality="confirmed",
            ),
            EvidenceSource(
                source_id="",
                source_type="news",
                title="AAPL catalyst follow-up",
                url="",
                observed_at="2026-06-18T00:00:00.000Z",
                finality="confirmed",
            ),
        ),
    )

    assert decision.ai_weight_haircut == 0.25
    assert "weak_ai_source_evidence" in decision.quality_flags


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
            source_evidence=[
                source_evidence_payload("news-1"),
                source_evidence_payload("news-2"),
            ],
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
        },
        {
            "sourceId": "news-2",
            "sourceType": "news",
            "title": "AAPL catalyst coverage",
            "url": "https://example.com/aapl-news",
            "observedAt": "2026-06-18T00:00:00.000Z",
            "finality": "confirmed",
        },
    ]
    assert body["tradeTimingPlan"]["actionLabel"] == "BUY"
    assert body["tradeTimingPlan"]["entryZone"]["low"] == 155.82
    assert body["tradeTimingPlan"]["entryZone"]["high"] == 162.18


def test_analysis_run_request_rejects_invalid_finality() -> None:
    with pytest.raises(ValidationError) as error:
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
            source_evidence=[
                source_evidence_payload("news-1"),
                source_evidence_payload("news-2"),
            ],
        )
    assert error.value.errors()[0]["loc"] == ("finality",)


def test_analysis_run_request_accepts_task_4_camel_case_payload_with_source_evidence() -> None:
    request = AnalysisRunRequest(
        instrumentId="US:XNAS:AAPL",
        finality="confirmed",
        bars=[],
        aiContext={
            "catalyst_score": 0.7,
            "uncertainty_score": 0.2,
            "evidence_quality_score": 0.9,
            "freshness_score": 0.9,
            "contradiction_count": 0,
            "source_count": 3,
        },
        sourceEvidence=[
            source_evidence_camel_payload("news-1"),
            source_evidence_camel_payload("news-2"),
        ],
    )

    assert request.instrument_id == "US:XNAS:AAPL"
    assert request.ai_context["source_count"] == 3
    assert [evidence.source_id for evidence in request.source_evidence] == [
        "news-1",
        "news-2",
    ]


def test_analysis_run_route_accepts_task_4_camel_case_payload_with_source_evidence() -> None:
    status_code, body = post_json("/analysis/run", analysis_run_camel_payload())

    assert status_code == 200
    assert body["instrumentId"] == "US:XNAS:AAPL"
    assert [source["sourceId"] for source in body["sourceEvidence"]] == [
        "news-1",
        "news-2",
    ]


def test_analysis_run_route_rejects_missing_source_evidence_as_client_error() -> None:
    payload = analysis_run_camel_payload()
    payload.pop("sourceEvidence")

    status_code, _body = post_json("/analysis/run", payload)

    assert status_code in {400, 422}


def test_analysis_run_route_rejects_empty_source_evidence_as_client_error() -> None:
    status_code, _body = post_json(
        "/analysis/run",
        analysis_run_camel_payload(source_evidence=[]),
    )

    assert status_code in {400, 422}


def test_analysis_run_route_rejects_duplicate_source_evidence_as_client_error() -> None:
    status_code, body = post_json(
        "/analysis/run",
        analysis_run_camel_payload(
            source_evidence=[
                source_evidence_camel_payload("news-1"),
                source_evidence_camel_payload("news-1"),
            ],
        ),
    )

    assert status_code in {400, 422}
    assert "Duplicate source evidence" in str(body)


def test_analysis_run_route_rejects_duplicate_fallback_source_evidence_as_client_error() -> None:
    status_code, body = post_json(
        "/analysis/run",
        analysis_run_camel_payload(
            source_evidence=[
                source_evidence_camel_payload(""),
                source_evidence_camel_payload(""),
            ],
        ),
    )

    assert status_code in {400, 422}
    assert "Duplicate source evidence" in str(body)


def test_analysis_run_route_rejects_duplicate_missing_id_source_evidence_as_client_error() -> None:
    first_source = source_evidence_camel_payload("news-1")
    second_source = source_evidence_camel_payload("news-2")
    first_source.pop("sourceId")
    second_source.pop("sourceId")

    status_code, body = post_json(
        "/analysis/run",
        analysis_run_camel_payload(source_evidence=[first_source, second_source]),
    )

    assert status_code in {400, 422}
    assert "Duplicate source evidence" in str(body)


def test_analysis_run_route_rejects_missing_id_source_without_url_title_fallback() -> None:
    source = source_evidence_camel_payload("")
    source["url"] = ""

    status_code, body = post_json(
        "/analysis/run",
        analysis_run_camel_payload(source_evidence=[source]),
    )

    assert status_code in {400, 422}
    assert "Source evidence without source_id requires URL and title" in str(body)
