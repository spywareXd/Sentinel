export type UserPunishment = {
  id: string;
  user_id: string;
  wallet_address: string | null;
  punishment_type: string;
  duration_hours: number | null;
  reason: string | null;
  case_id: string | null;
  issued_at: string;
  expires_at: string | null;
  is_active: boolean;
  issued_by: string | null;
};
