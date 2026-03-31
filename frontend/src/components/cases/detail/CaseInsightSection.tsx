import type { CaseRecord } from "@/types/mockdata/cases";

type CaseInsightSectionProps = {
  caseItem: CaseRecord;
};

export default function CaseInsightSection({ caseItem }: CaseInsightSectionProps) {
  return (
    <div className="space-y-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--on-surface-variant)]">
        AI Oversight Reason
      </p>
      <div className="rounded-2xl bg-[color:color-mix(in_srgb,var(--surface-container-high)_55%,transparent)] p-4">
        <p className="text-sm leading-7 text-[var(--on-surface)]">
          {caseItem.aiReason}
        </p>
      </div>
      <div className="rounded-2xl bg-[color:color-mix(in_srgb,var(--surface-container-high)_55%,transparent)] p-4">
        <p className="text-sm leading-7 text-[var(--on-surface)]">
          {caseItem.summary}
        </p>
      </div>
    </div>
  );
}
