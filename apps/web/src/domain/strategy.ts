export type StrategyProfile = {
  id: string;
  name: string;
  horizon: "swing_days_to_weeks";
  rulesWeight: number;
  aiWeight: number;
  aiWeightRange: {
    min: number;
    max: number;
  };
  minimumEvidenceSources: number;
  maximumAiWeightWithoutFreshSources: number;
};

export const defaultSwingMomentumProfile: StrategyProfile = {
  id: "swing-momentum-v1",
  name: "Swing Momentum",
  horizon: "swing_days_to_weeks",
  rulesWeight: 0.6,
  aiWeight: 0.4,
  aiWeightRange: {
    min: 0.2,
    max: 0.6,
  },
  minimumEvidenceSources: 2,
  maximumAiWeightWithoutFreshSources: 0.15,
};
