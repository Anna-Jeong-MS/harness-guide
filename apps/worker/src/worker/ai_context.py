from worker.domain import AIContextScore, StrategyProfile


def apply_ai_weight_haircut(
    profile: StrategyProfile,
    ai_context: AIContextScore,
    displayed_source_count: int | None = None,
) -> float:
    source_count = (
        ai_context.source_count
        if displayed_source_count is None
        else displayed_source_count
    )
    evidence_is_weak = (
        source_count < profile.minimum_evidence_sources
        or ai_context.evidence_quality_score < 0.7
        or ai_context.freshness_score < 0.7
        or ai_context.contradiction_count > 0
    )

    if evidence_is_weak:
        return profile.maximum_ai_weight_without_fresh_sources

    return profile.ai_weight
