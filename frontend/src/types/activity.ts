export type ActivityStatus = "Active" | "Expired";

export type ActivityRecord = {
  id: string;
  title: string;
  punishmentType: string;
  status: ActivityStatus;
  issuedAt: string;
  expiresAt: string;
  durationLabel: string;
  reason: string;
  caseReference: string;
  issuerLabel: string;
  walletAddress: string;
  isActive: boolean;
};
