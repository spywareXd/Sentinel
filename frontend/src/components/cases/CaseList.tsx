import { MessageSquareWarning, ShieldAlert, ShieldCheck } from "lucide-react";
import type { CaseRecord } from "@/types/mockdata/cases";

type QueueFilter = "Assigned" | "Active" | "Resolved" | "All";

type CaseListProps = {
  cases: CaseRecord[];
  selectedCaseId: string;
  onSelectCase: (caseId: string) => void;
  queueFilter: QueueFilter;
  onQueueFilterChange: (filter: QueueFilter) => void;
  quickFilters: {
    highSeverity: boolean;
    needsVote: boolean;
  };
  onToggleQuickFilter: (filter: "highSeverity" | "needsVote") => void;
};

const queueTabs: QueueFilter[] = ["Assigned", "Active", "Resolved", "All"];

const severityTone = {
  High: "bg-[color:color-mix(in_srgb,var(--error)_20%,transparent)] text-[var(--error)]",
  Medium:
    "bg-[color:color-mix(in_srgb,var(--tertiary)_18%,transparent)] text-[var(--tertiary)]",
  Low: "bg-[var(--surface-container-highest)] text-[var(--on-surface-variant)]",
} as const;

const iconTone = {
  High: {
    Icon: ShieldAlert,
    iconColor: "text-[var(--error)]",
    railColor: "border-[var(--error)]",
  },
  Medium: {
    Icon: MessageSquareWarning,
    iconColor: "text-[var(--secondary)]",
    railColor: "border-[var(--secondary)]",
  },
  Low: {
    Icon: ShieldCheck,
    iconColor: "text-[var(--on-surface-variant)]",
    railColor: "border-[var(--surface-container-highest)]",
  },
} as const;

export default function CaseList({
  cases,
  selectedCaseId,
  onSelectCase,
  queueFilter,
  onQueueFilterChange,
  quickFilters,
  onToggleQuickFilter,
}: CaseListProps) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 border-b border-[color:color-mix(in_srgb,var(--outline-variant)_25%,transparent)] pb-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-6">
          {queueTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => onQueueFilterChange(tab)}
              className={[
                "relative text-sm font-bold uppercase transition-colors",
                tab === queueFilter
                  ? "text-[var(--primary)]"
                  : "text-[var(--on-surface-variant)] hover:text-[var(--on-surface)]",
              ].join(" ")}
            >
              {tab}
              {tab === queueFilter && (
                <span className="absolute -bottom-[17px] left-0 right-0 h-0.5 bg-[var(--primary)]" />
              )}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => onToggleQuickFilter("highSeverity")}
            className={[
              "rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-tight transition-colors",
              quickFilters.highSeverity
                ? "bg-[color:color-mix(in_srgb,var(--error)_24%,transparent)] text-[var(--error)]"
                : "bg-[var(--surface-container-high)] text-[var(--on-surface-variant)] hover:text-[var(--on-surface)]",
            ].join(" ")}
          >
            High Severity
          </button>
          <button
            onClick={() => onToggleQuickFilter("needsVote")}
            className={[
              "rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-tight transition-colors",
              quickFilters.needsVote
                ? "bg-[color:color-mix(in_srgb,var(--secondary)_22%,transparent)] text-[var(--secondary)]"
                : "bg-[var(--surface-container-high)] text-[var(--on-surface-variant)] hover:text-[var(--on-surface)]",
            ].join(" ")}
          >
            Needs Vote
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {cases.map((caseItem) => {
          const style = iconTone[caseItem.severity];
          const Icon = style.Icon;
          const isSelected = selectedCaseId === caseItem.id;

          return (
            <button
              key={caseItem.id}
              onClick={() => onSelectCase(caseItem.id)}
              className={[
                "group flex cursor-pointer gap-6 rounded-3xl border-l-4 p-5 text-left transition-all",
                style.railColor,
                isSelected
                  ? "bg-[var(--surface-container-high)]"
                  : caseItem.status === "Resolved"
                    ? "bg-[var(--surface-container-lowest)] opacity-70 hover:opacity-100"
                    : "bg-[var(--surface-container-low)] hover:bg-[var(--surface-bright)]",
              ].join(" ")}
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
                  >
                    {caseItem.severity} Severity
                  </span>
                  <span className="text-[10px] font-medium text-[var(--on-surface-variant)]">
                    {caseItem.resolvedAt ?? caseItem.openedAt}
                  </span>
                  {caseItem.assignedToMe && (
                    <span className="rounded-full bg-[color:color-mix(in_srgb,var(--primary)_18%,transparent)] px-2 py-0.5 text-[10px] font-black uppercase text-[var(--primary)]">
                      Assigned to you
                    </span>
                  )}
                </div>

                <p className="mb-3 line-clamp-2 text-sm italic text-[var(--on-surface-variant)]">
                  "{caseItem.flaggedMessage}"
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
                      : `${Math.round(caseItem.harmfulScore * 100)}% SIGNAL`}
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
