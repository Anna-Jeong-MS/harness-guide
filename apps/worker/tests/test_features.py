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
