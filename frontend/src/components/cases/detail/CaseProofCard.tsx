import type { CaseRecord } from "@/types/mockdata/cases";

type CaseProofCardProps = {
  caseItem: CaseRecord;
};

export default function CaseProofCard({ caseItem }: CaseProofCardProps) {
  return (
    <div
      id="cases-proof"
      className="flex items-center justify-between rounded-2xl border border-[color:color-mix(in_srgb,var(--outline-variant)_20%,transparent)] bg-[color:color-mix(in_srgb,var(--surface-container)_50%,transparent)] p-4"
    >
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--on-surface-variant)]">
          Proof of Oversight
        </p>
        <p className="mt-1 font-mono text-[10px] text-[var(--secondary)]">
          {caseItem.chainRef}
        </p>
      </div>
      <span className="text-xs text-[var(--on-surface-variant)]">
        {caseItem.resolvedAt ?? "Pending"}
      </span>
    </div>
  );
}
