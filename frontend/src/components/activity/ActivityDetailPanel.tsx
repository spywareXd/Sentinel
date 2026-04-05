import { Ban, Clock3, Gavel, ShieldAlert } from "lucide-react";
import type { ActivityRecord } from "@/types/activity";

type ActivityDetailPanelProps = {
  record: ActivityRecord;
};

const punishmentMeta = {
  ban: {
    Icon: Ban,
    iconColor: "text-[var(--error)]",
    statusTone:
      "bg-[color:color-mix(in_srgb,var(--error)_16%,transparent)] text-[var(--error)]",
  },
  kick: {
    Icon: ShieldAlert,
    iconColor: "text-[var(--tertiary)]",
    statusTone:
      "bg-[color:color-mix(in_srgb,var(--tertiary)_16%,transparent)] text-[var(--tertiary)]",
  },
  timeout: {
    Icon: Clock3,
    iconColor: "text-[var(--secondary)]",
    statusTone:
      "bg-[color:color-mix(in_srgb,var(--secondary)_16%,transparent)] text-[var(--secondary)]",
  },
  default: {
    Icon: Gavel,
    iconColor: "text-[var(--primary)]",
    statusTone:
      "bg-[color:color-mix(in_srgb,var(--primary)_16%,transparent)] text-[var(--primary)]",
  },
} as const;

const fieldCardClass =
  "rounded-2xl border border-[color:color-mix(in_srgb,var(--outline-variant)_25%,transparent)] bg-[var(--surface-container-low)] p-4";

export default function ActivityDetailPanel({ record }: ActivityDetailPanelProps) {
  const key = record.punishmentType.toLowerCase();
  const meta = punishmentMeta[key as keyof typeof punishmentMeta] ?? punishmentMeta.default;
  const Icon = meta.Icon;

  return (
    <aside className="flex h-full min-h-0 flex-col gap-6 rounded-[1.75rem] border border-[color:color-mix(in_srgb,var(--outline-variant)_25%,transparent)] bg-[color:color-mix(in_srgb,var(--surface-container-highest)_45%,transparent)] p-6 backdrop-blur-xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <span
            className={[
              "inline-flex rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em]",
              meta.statusTone,
            ].join(" ")}
          >
            {record.status}
          </span>
          <h3 className="mt-4 font-headline text-2xl font-black tracking-tight text-[var(--on-surface)]">
            {record.title}
          </h3>
          <p className="mt-1 text-sm text-[var(--on-surface-variant)]">
            {record.issuedAt} • {record.durationLabel}
          </p>
        </div>

        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--surface-container-low)]">
          <Icon className={["h-6 w-6", meta.iconColor].join(" ")} />
        </div>
      </div>

      <div className="premium-scrollbar flex-1 space-y-4 overflow-y-auto pr-2">
        <section className={fieldCardClass}>
          <p className="mb-2 text-[10px] font-black uppercase tracking-[0.22em] text-[var(--on-surface-variant)]">
            Reason
          </p>
          <p className="text-sm leading-7 text-[var(--on-surface)]">{record.reason}</p>
        </section>

        <div className="grid gap-4 md:grid-cols-2">
          <section className={fieldCardClass}>
            <p className="mb-2 text-[10px] font-black uppercase tracking-[0.22em] text-[var(--on-surface-variant)]">
              Expires
            </p>
            <p className="text-sm font-semibold text-[var(--on-surface)]">
              {record.expiresAt}
            </p>
          </section>

          <section className={fieldCardClass}>
            <p className="mb-2 text-[10px] font-black uppercase tracking-[0.22em] text-[var(--on-surface-variant)]">
              Issued By
            </p>
            <p className="text-sm font-semibold text-[var(--on-surface)]">
              {record.issuerLabel}
            </p>
          </section>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <section className={fieldCardClass}>
            <p className="mb-2 text-[10px] font-black uppercase tracking-[0.22em] text-[var(--on-surface-variant)]">
              Case Reference
            </p>
            <p className="break-all text-sm font-semibold text-[var(--on-surface)]">
              {record.caseReference}
            </p>
          </section>

          <section className={fieldCardClass}>
            <p className="mb-2 text-[10px] font-black uppercase tracking-[0.22em] text-[var(--on-surface-variant)]">
              Wallet On Record
            </p>
            <p className="break-all text-sm font-semibold text-[var(--on-surface)]">
              {record.walletAddress}
            </p>
          </section>
        </div>
      </div>
    </aside>
  );
}
