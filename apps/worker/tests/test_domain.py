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
