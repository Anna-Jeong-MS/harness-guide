import type { Prisma } from "@prisma/client";
import type { SignalDecision } from "../domain/signals";

export type SignalRepository = {
  saveSignal(workspaceId: string, decision: SignalDecision): Promise<{ id: string }>;
};

export function createPrismaSignalRepository(client: {
  signal: {
    create(args: { data: Prisma.SignalUncheckedCreateInput }): PromiseLike<{ id: string }>;
  };
}): SignalRepository {
  return {
    async saveSignal(workspaceId, decision) {
      return client.signal.create({
        data: {
          workspaceId,
          instrumentId: decision.instrumentId,
          finality: decision.finality,
          actionLabel: decision.tradeTimingPlan.actionLabel,
          confidence: decision.confidence,
          rulesContribution: decision.rulesContribution,
          aiContribution: decision.aiContribution,
          aiWeightHaircut: decision.aiWeightHaircut,
          qualityFlags: toJson(decision.qualityFlags),
          sourceEvidence: toJson(decision.sourceEvidence),
          tradeTimingPlan: toJson(decision.tradeTimingPlan),
          rationale: toJson(decision.rationale),
        },
      });
    },
  };
}

function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}
