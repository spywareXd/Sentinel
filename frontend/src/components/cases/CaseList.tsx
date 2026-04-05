import { MessageSquareWarning, ShieldAlert, ShieldCheck } from "lucide-react";
import type { CaseRecord } from "@/types/mockdata/cases";

type CaseListProps = {
  cases: CaseRecord[];
  selectedCaseId: string;
  onSelectCase: (caseId: string) => void;
};

const severityTone = {
  High: "text-[var(--error)]",
  Medium: "text-[var(--tertiary)]",
  Low: "text-[var(--on-surface-variant)]",
} as const;

const iconTone = {
  High: {
    Icon: ShieldAlert,
    iconColor: "text-[var(--error)]",
  },
  Medium: {
    Icon: MessageSquareWarning,
    iconColor: "text-[var(--secondary)]",
  },
  Low: {
    Icon: ShieldCheck,
    iconColor: "text-[var(--on-surface-variant)]",
  },
} as const;

const severityStyles = {
  High: {
    railColor: "color-mix(in srgb, var(--error) 88%, white 12%)",
    railGlow: "color-mix(in srgb, var(--error) 28%, transparent)",
    pillBackground: "color-mix(in srgb, var(--error) 14%, transparent)",
    pillBorder: "color-mix(in srgb, var(--error) 30%, transparent)",
  },
  Medium: {
    railColor: "color-mix(in srgb, var(--tertiary) 76%, white 24%)",
    railGlow: "color-mix(in srgb, var(--tertiary) 24%, transparent)",
    pillBackground: "color-mix(in srgb, var(--tertiary) 14%, transparent)",
    pillBorder: "color-mix(in srgb, var(--tertiary) 28%, transparent)",
  },
  Low: {
    railColor: "color-mix(in srgb, var(--primary) 34%, var(--surface-container-highest) 66%)",
    railGlow: "color-mix(in srgb, var(--primary) 16%, transparent)",
    pillBackground: "color-mix(in srgb, var(--primary) 12%, transparent)",
    pillBorder: "color-mix(in srgb, var(--primary) 22%, transparent)",
  },
} as const;

export default function CaseList({
  cases,
  selectedCaseId,
  onSelectCase,
}: CaseListProps) {
  return (
    <section className="flex flex-col gap-4" data-case-list-root="true">
      <div className="flex flex-col gap-3">
        {cases.map((caseItem) => {
          const style = iconTone[caseItem.severity];
          const severityStyle = severityStyles[caseItem.severity];
          const Icon = style.Icon;
          const isSelected = selectedCaseId === caseItem.id;

          return (
            <button
              key={caseItem.id}
              onClick={() => onSelectCase(caseItem.id)}
              className={[
                "group flex cursor-pointer gap-6 rounded-3xl border-l-[5px] p-5 text-left transition-all",
                isSelected
                  ? "bg-[var(--surface-container-high)]"
                  : !caseItem.assignedToMe
                    ? "bg-[var(--surface-container-lowest)] opacity-70 hover:opacity-100"
                    : "bg-[var(--surface-container-low)] hover:bg-[var(--surface-bright)]",
              ].join(" ")}
              style={{
                borderLeftColor: severityStyle.railColor,
                boxShadow: `-1px 0 0 0 ${severityStyle.railGlow}`,
              }}
            >
              <div className="flex shrink-0 flex-col items-center gap-2">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--surface-container-lowest)]">
                  <Icon className={["h-5 w-5", style.iconColor].join(" ")} />
                </div>
                <span className="font-headline text-[10px] font-black text-[var(--on-surface-variant)]">
                  {caseItem.number}
                </span>
              </div>

              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-3">
                  <span className="text-sm font-bold text-[var(--on-surface)]">
                    {caseItem.title}
                  </span>
                  <span
                    className={[
                      "rounded px-2 py-0.5 text-[10px] font-black uppercase",
                      severityTone[caseItem.severity],
                    ].join(" ")}
                    style={{
                      background: severityStyle.pillBackground,
                    }}
                  >
                    {caseItem.severity} Severity
                  </span>
                  <span className="text-[10px] font-medium text-[var(--on-surface-variant)]">
                    {caseItem.resolvedAt ?? caseItem.openedAt}
                  </span>
                  {caseItem.assignedToMe && (
                    <span
                      className="rounded-full bg-[var(--surface-container-highest)] px-2 py-0.5 text-[10px] font-black uppercase text-[var(--on-surface-variant)]"
                    >
                      Assigned to you
                    </span>
                  )}
                  {!caseItem.assignedToMe && caseItem.wasAssignedToMe && (
                    <span className="rounded-full bg-[var(--surface-container-highest)] px-2 py-0.5 text-[10px] font-black uppercase text-[var(--on-surface-variant)]">
                      In your history
                    </span>
                  )}
                </div>

                <p className="mb-3 line-clamp-2 text-sm italic text-[var(--on-surface-variant)]">
                  &quot;{caseItem.flaggedMessage}&quot;
                </p>

                <div className="flex flex-wrap items-center gap-6">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-[var(--on-surface)]">
                      {caseItem.offender}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-[var(--on-surface-variant)]">
                      {caseItem.aiReason}
                    </span>
                  </div>
                  <div className="h-1.5 max-w-[180px] flex-1 overflow-hidden rounded-full bg-[var(--surface-container-lowest)]">
                    <div
                      className="h-full bg-[var(--secondary)]"
                      style={{ width: `${Math.round(caseItem.harmfulScore * 100)}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-black text-[var(--on-surface-variant)]">
                    {caseItem.status === "Resolved"
                      ? caseItem.decision
                      : caseItem.status === "Backend Error"
                        ? "Backend Error"
                        : `${Math.round(caseItem.harmfulScore * 100)}%`}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
