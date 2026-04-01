import type { CaseRecord } from "@/types/mockdata/cases";

const statusTone = {
  Assigned: "bg-[color:color-mix(in_srgb,var(--error)_18%,transparent)] text-[var(--error)]",
  Voting:
    "bg-[color:color-mix(in_srgb,var(--secondary)_18%,transparent)] text-[var(--secondary)]",
  Resolved:
    "bg-[color:color-mix(in_srgb,var(--tertiary)_18%,transparent)] text-[var(--tertiary)]",
} as const;

type CaseDetailHeaderProps = {
  caseItem: CaseRecord;
};

export default function CaseDetailHeader({ caseItem }: CaseDetailHeaderProps) {
  return (
    <div>
      <div className="mb-4 flex items-start justify-between">
        <span
          className={[
            "rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em]",
            statusTone[caseItem.status],
          ].join(" ")}
        >
          {caseItem.assignedToMe ? "Urgent Action" : caseItem.status}
        </span>
      </div>

      <h4 className="font-headline text-2xl font-black tracking-tight text-[var(--on-surface)]">
        {caseItem.number} Details
      </h4>
      <p className="mt-1 text-xs font-medium text-[var(--on-surface-variant)]">
        {caseItem.assignedToMe ? "Assigned to: You" : `Reporter: ${caseItem.reporter}`}{" "}
        • {caseItem.category}
      </p>
    </div>
  );
}
