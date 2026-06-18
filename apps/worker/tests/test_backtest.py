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
