import type { CaseRecord } from "@/types/mockdata/cases";

type CaseInsightSectionProps = {
  caseItem: CaseRecord;
};

/**
 * Formats punishment duration in minutes into a human-readable string.
 */
const formatDuration = (minutes: number | null): string => {
  if (minutes === null || minutes === 0) return "No duration";
  
  if (minutes >= 43200) {
    const days = Math.floor(minutes / 1440);
    return `${days} day${days > 1 ? "s" : ""}`;
  }
  
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    return `${hours} hour${hours > 1 ? "s" : ""}`;
  }
  
  return `${minutes} minute${minutes > 1 ? "s" : ""}`;
};

const getPunishmentColor = (type: string | null) => {
  switch (type?.toLowerCase()) {
    case "ban":
      return "var(--error)";
    case "timeout":
      return "var(--warning, #f59e0b)";
    case "warning":
      return "var(--primary)";
    default:
      return "var(--on-surface-variant)";
  }
};

export default function CaseInsightSection({ caseItem }: CaseInsightSectionProps) {
  const hasPunishment = caseItem.punishmentType && caseItem.punishmentType !== "none";

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--on-surface-variant)]">
          AI Oversight Reason
        </p>
        <div className="rounded-2xl bg-[color:color-mix(in_srgb,var(--surface-container-high)_55%,transparent)] p-4">
          <p className="text-sm leading-7 text-[var(--on-surface)]">
            {caseItem.aiReason}
          </p>
        </div>
      </div>

      {hasPunishment && (
        <div className="space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--on-surface-variant)]">
            AI Recommendation
          </p>
          <div className="flex items-center gap-3 rounded-2xl bg-[color:color-mix(in_srgb,var(--surface-container-high)_55%,transparent)] p-4">
            <div 
              className="flex items-center justify-center rounded-lg px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white"
              style={{ background: getPunishmentColor(caseItem.punishmentType) }}
            >
              {caseItem.punishmentType}
            </div>
            <div className="h-4 w-px bg-[var(--outline-variant)] opacity-30" />
            <p className="text-sm font-bold text-[var(--on-surface)]">
              {formatDuration(caseItem.punishmentDuration)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
