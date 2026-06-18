import type { InstrumentId } from "./market";

export type PortfolioType = "personal" | "client" | "model";

export type Holding = {
  instrumentId: InstrumentId;
  quantity: number;
  averageEntryPrice: number;
  marketValue: number;
};

export type Portfolio = {
  id: string;
  workspaceId: string;
  type: PortfolioType;
  name: string;
  holdings: Holding[];
};

export type PortfolioActionLabel =
  | "NEW_BUY_CANDIDATE"
  | "ADD_ON_CANDIDATE"
  | "HOLD_AND_MONITOR"
  | "TRIM_CANDIDATE"
  | "EXIT_CANDIDATE"
  | "REVIEW_REQUIRED";
