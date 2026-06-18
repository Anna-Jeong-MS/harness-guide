export type AuditEventType =
  | "DATA_VERSION_USED"
  | "STRATEGY_PROFILE_USED"
  | "AI_WEIGHT_APPLIED"
  | "SIGNAL_OUTPUT_CREATED"
  | "USER_OVERRIDE_CREATED"
  | "RESEARCH_NOTE_APPROVED"
  | "REPORT_EXPORTED";

export type AuditEvent = {
  id: string;
  type: AuditEventType;
  subjectId: string;
  occurredAt: string;
  metadata: Record<string, string | number | boolean>;
};
