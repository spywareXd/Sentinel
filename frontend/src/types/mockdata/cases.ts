export type CaseSeverity = "Extreme" | "High" | "Medium" | "Low";

export type CaseStatus = "Assigned" | "Voting" | "Resolved";

export type CaseDecision = "Punished" | "Dismissed" | null;

export type CaseRecord = {
  id: string;
  number: string;
  title: string;
  category: string;
  severity: CaseSeverity;
  status: CaseStatus;
  decision: CaseDecision;
  openedAt: string;
  resolvedAt?: string;
  assignedToMe: boolean;
  wasAssignedToMe: boolean;
  needsVote: boolean;
  harmfulScore: number;
  aiReason: string;
  offender: string;
  reporter: string;
  flaggedMessage: string;
  summary: string;
  voteBreakdown: string;
  outcome: string;
  chainRef: string;
};
