from worker.ai_context import apply_ai_weight_haircut
from worker.domain import (
    AIContextScore,
    EvidenceSource,
    FeatureSet,
    SignalDecision,
    StrategyProfile,
    TradeTimingPlan,
)


def create_signal_decision(
    feature_set: FeatureSet,
    ai_context: AIContextScore,
    profile: StrategyProfile,
    source_evidence: tuple[EvidenceSource, ...] = (),
) -> SignalDecision:
    adjusted_ai_weight = apply_ai_weight_haircut(profile, ai_context)
    ai_weight_haircut = round(profile.ai_weight - adjusted_ai_weight, 4)
    ai_raw_score = ai_context.catalyst_score - ai_context.uncertainty_score
    if round(ai_raw_score * adjusted_ai_weight, 4) != 0 and not source_evidence:
        raise ValueError("AI-influenced Signal Decisions require source evidence")

    trend_score = 1 if feature_set.moving_average_20 > feature_set.moving_average_50 else -1
    momentum_score = 1 if 45 <= feature_set.rsi_14 <= 70 else -1
    volume_score = 1 if feature_set.volume_surge_ratio >= 1.05 else 0
    rules_raw_score = (trend_score + momentum_score + volume_score) / 3

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
        source_evidence=source_evidence,
        trade_timing_plan=trade_timing_plan,
        rationale=(
            f"Rules contribution: {rules_contribution}",
            f"AI contribution: {ai_contribution}",
            f"Total score: {round(total_score, 4)}",
        ),
    )
