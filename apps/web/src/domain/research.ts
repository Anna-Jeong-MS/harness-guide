import type { InstrumentId } from "./market";

export type ResearchNote = {
  id: string;
  instrumentId: InstrumentId;
  title: string;
  bodyMarkdown: string;
  approved: boolean;
  createdAt: string;
};

export type ClientReport = {
  id: string;
  title: string;
  bodyMarkdown: string;
  approved: boolean;
};
