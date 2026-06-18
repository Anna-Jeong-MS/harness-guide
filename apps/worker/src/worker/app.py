from fastapi import FastAPI
from pydantic import AliasChoices, BaseModel, ConfigDict, Field, model_validator

from worker.domain import (
    AIContextScore,
    EvidenceSource,
    EvidenceSourceType,
    Finality,
    InstrumentId,
    StrategyProfile,
    canonical_source_evidence_key,
)
from worker.features import build_feature_set
from worker.signal_decision import create_signal_decision

app = FastAPI()


class EvidenceSourceRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    source_id: str = Field(
        default="",
        validation_alias=AliasChoices("source_id", "sourceId"),
    )
    source_type: EvidenceSourceType = Field(
        validation_alias=AliasChoices("source_type", "sourceType")
    )
    title: str
    url: str
    observed_at: str = Field(validation_alias=AliasChoices("observed_at", "observedAt"))
    finality: Finality


class AIContextScoreRequest(BaseModel):
    catalyst_score: float = Field(ge=0, le=1)
    uncertainty_score: float = Field(ge=0, le=1)
    evidence_quality_score: float = Field(ge=0, le=1)
    freshness_score: float = Field(ge=0, le=1)
    contradiction_count: int = Field(ge=0)
    source_count: int = Field(ge=0)

    def to_domain(self) -> AIContextScore:
        return AIContextScore(
            catalyst_score=self.catalyst_score,
            uncertainty_score=self.uncertainty_score,
            evidence_quality_score=self.evidence_quality_score,
            freshness_score=self.freshness_score,
            contradiction_count=self.contradiction_count,
            source_count=self.source_count,
        )


class AnalysisRunRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    instrument_id: str = Field(
        validation_alias=AliasChoices("instrument_id", "instrumentId")
    )
    finality: Finality
    bars: list[dict[str, float | str]]
    ai_context: AIContextScoreRequest = Field(
        validation_alias=AliasChoices("ai_context", "aiContext")
    )
    source_evidence: list[EvidenceSourceRequest] = Field(
        min_length=1,
        validation_alias=AliasChoices("source_evidence", "sourceEvidence"),
    )

    @model_validator(mode="after")
    def reject_duplicate_source_evidence(self) -> "AnalysisRunRequest":
        seen: set[tuple[str, str]] = set()
        for evidence in self.source_evidence:
            key = canonical_source_evidence_key(evidence)
            if key is None:
                raise ValueError(
                    "Source evidence without source_id requires URL and title"
                )
            if key in seen:
                raise ValueError("Duplicate source evidence is not allowed")
            seen.add(key)
        return self


@app.post("/analysis/run")
def run_analysis(request: AnalysisRunRequest) -> dict[str, object]:
    instrument_id = InstrumentId.parse(request.instrument_id)
    feature_set = build_feature_set(
        instrument_id=instrument_id,
        bars=request.bars,
        finality=request.finality,
    )
    ai_context = request.ai_context.to_domain()
    decision = create_signal_decision(
        feature_set=feature_set,
        ai_context=ai_context,
        profile=StrategyProfile.default_swing_momentum(),
        source_evidence=tuple(
            EvidenceSource(
                source_id=evidence.source_id,
                source_type=evidence.source_type,
                title=evidence.title,
                url=evidence.url,
                observed_at=evidence.observed_at,
                finality=evidence.finality,
            )
            for evidence in request.source_evidence
        ),
    )

    return {
        "instrumentId": str(decision.instrument_id),
        "finality": decision.finality,
        "confidence": decision.confidence,
        "rulesContribution": decision.rules_contribution,
        "aiContribution": decision.ai_contribution,
        "aiWeightHaircut": decision.ai_weight_haircut,
        "qualityFlags": list(decision.quality_flags),
        "sourceEvidence": [
            {
                "sourceId": evidence.source_id,
                "sourceType": evidence.source_type,
                "title": evidence.title,
                "url": evidence.url,
                "observedAt": evidence.observed_at,
                "finality": evidence.finality,
            }
            for evidence in decision.source_evidence
        ],
        "tradeTimingPlan": {
            "actionLabel": decision.trade_timing_plan.action_label,
            "entryZone": {
                "low": decision.trade_timing_plan.entry_low,
                "high": decision.trade_timing_plan.entry_high,
            },
            "stopLevel": decision.trade_timing_plan.stop_level,
            "targetZone": {
                "low": decision.trade_timing_plan.target_low,
                "high": decision.trade_timing_plan.target_high,
            },
            "timeHorizon": decision.trade_timing_plan.time_horizon,
        },
        "rationale": list(decision.rationale),
    }
