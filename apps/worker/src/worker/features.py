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

    gains: list[float] = []
    losses: list[float] = []
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
