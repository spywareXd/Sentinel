export type CaseSeverity = "Extreme" | "High" | "Medium" | "Low";

export type CaseStatus = "Assigned" | "Voting" | "Resolved" | "Backend Error";

export type CaseDecision = "Punished" | "Dismissed" | null;

export type CaseRecord = {
  id: string;
  messageId: string | null;
  number: string;
  createdAtTimestamp: number;
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
  blockchainCaseId: number | null;
  punishmentType: string | null;
  punishmentDuration: number | null;
  txHash: string | null;
};
