"use client";

import { ShieldAlert } from "lucide-react";
import { getPunishmentExpiry } from "@/lib/punishment";
import type { UserPunishment } from "@/types/database/userPunishment";

type PunishmentPopoutProps = {
  punishment: UserPunishment;
  onAcknowledge: () => void;
};

const formatPunishmentTitle = (punishment: UserPunishment) => {
  const type = punishment.punishment_type.replace(/[_-]+/g, " ");
  const expiresAt = getPunishmentExpiry(punishment);

  if (!expiresAt) {
    return `${type} active`;
  }

  return `${type} until ${expiresAt.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })}`;
};

export default function PunishmentPopout({
  punishment,
  onAcknowledge,
}: PunishmentPopoutProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(4,6,12,0.72)] px-6"
      style={{
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
      }}
    >
      <div className="w-full max-w-md rounded-[2rem] border border-[color:color-mix(in_srgb,var(--error)_22%,transparent)] bg-[color:color-mix(in_srgb,var(--surface-container-high)_95%,transparent)] p-7 shadow-[0_30px_80px_rgba(8,10,18,0.55)]">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:color-mix(in_srgb,var(--error)_14%,transparent)] text-[var(--error)]">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#ffb4ab]">
              Punishment Notice
            </p>
            <h2 className="mt-1 text-lg font-bold text-[var(--on-surface)]">
              {formatPunishmentTitle(punishment)}
            </h2>
          </div>
        </div>

        <div className="rounded-2xl bg-[color:color-mix(in_srgb,var(--surface-container-lowest)_90%,transparent)] px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--on-surface-variant)]">
            Reason
          </p>
          <p className="mt-2 text-sm leading-7 text-[var(--on-surface)]">
            {punishment.reason?.trim() || "No reason was provided for this punishment."}
          </p>
        </div>

        <button
          type="button"
          onClick={onAcknowledge}
          className="mt-6 w-full rounded-2xl bg-gradient-to-r from-[var(--primary)] to-[var(--primary-container)] px-4 py-3 text-sm font-bold text-[#07006c] shadow-[0_16px_30px_rgba(128,131,255,0.22)] transition-transform hover:scale-[1.01] active:scale-[0.99]"
        >
          OK
        </button>
      </div>
    </div>
  );
}
