import type { UserPunishment } from "@/types/database/userPunishment";

const toValidDate = (value?: string | null) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const getPunishmentExpiry = (punishment: UserPunishment): Date | null => {
  const explicitExpiry = toValidDate(punishment.expires_at);
  if (explicitExpiry) return explicitExpiry;

  const issuedAt = toValidDate(punishment.issued_at);
  if (!issuedAt) return null;

  if (typeof punishment.duration === "number" && punishment.duration > 0) {
    return new Date(issuedAt.getTime() + punishment.duration * 60 * 1000);
  }

  if (typeof punishment.duration_hours === "number" && punishment.duration_hours > 0) {
    return new Date(issuedAt.getTime() + punishment.duration_hours * 60 * 60 * 1000);
  }

  return null;
};

export const isActivePunishment = (punishment: UserPunishment): boolean => {
  if (!punishment.is_active) return false;

  const expiry = getPunishmentExpiry(punishment);
  if (!expiry) return true;

  return expiry.getTime() > Date.now();
};
