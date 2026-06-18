from __future__ import annotations

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
