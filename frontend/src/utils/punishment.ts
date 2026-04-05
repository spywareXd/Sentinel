import type { UserPunishment } from "@/types/database/userPunishment";

const PUNISHMENT_REASON_SEPARATOR = "|||";

const toValidDate = (value?: string | null) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const normalizeReasonPart = (value?: string | null) => value?.trim() || "";

export const splitPunishmentReason = (reason?: string | null) => {
  const normalizedReason = normalizeReasonPart(reason);
  if (!normalizedReason) {
    return {
      summary: "",
      detail: "",
      display: "No reason was provided.",
    };
  }

  const separatorIndex = normalizedReason.indexOf(PUNISHMENT_REASON_SEPARATOR);
  if (separatorIndex === -1) {
    return {
      summary: normalizedReason,
      detail: "",
      display: normalizedReason,
    };
  }

  const summary = normalizeReasonPart(normalizedReason.slice(0, separatorIndex));
  const detail = normalizeReasonPart(
    normalizedReason.slice(separatorIndex + PUNISHMENT_REASON_SEPARATOR.length),
  );

  return {
    summary,
    detail,
    display: summary && detail ? `${summary}: ${detail}` : summary || detail || "No reason was provided.",
  };
};

export const getPunishmentExpiry = (punishment: UserPunishment): Date | null => {
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

export const isExpiredActivePunishment = (punishment: UserPunishment): boolean => {
  if (!punishment.is_active) return false;

  const expiry = getPunishmentExpiry(punishment);
  if (!expiry) return false;

  return expiry.getTime() <= Date.now();
};

export const getExpiredActivePunishmentIds = (
  punishments: UserPunishment[] | null | undefined,
): string[] =>
  [...new Set((punishments ?? []).filter(isExpiredActivePunishment).map((punishment) => punishment.id))];

export const isActivePunishment = (punishment: UserPunishment): boolean => {
  if (!punishment.is_active) return false;

  const expiry = getPunishmentExpiry(punishment);
  if (!expiry) return true;

  return expiry.getTime() > Date.now();
};
