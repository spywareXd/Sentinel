export type UserPunishment = {
  id: string;
  user_id: string;
  wallet_address: string | null;
  punishment_type: string;
  duration: number | null;
  duration_hours?: number | null;
  reason: string | null;
  case_id: string | null;
  issued_at: string;
  is_active: boolean;
  issued_by: string | null;
};
