import type { CaseRecord } from "@/types/mockdata/cases";

type CaseFlaggedMessageCardProps = {
  caseItem: CaseRecord;
};

export default function CaseFlaggedMessageCard({
  caseItem,
}: CaseFlaggedMessageCardProps) {
  return (
    <div
      id="cases-about"
      className="rounded-2xl bg-[var(--surface-container-lowest)] p-4"
    >
      <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--on-surface-variant)]">
        Flagged Message
      </p>
      <div className="rounded-xl border-l-2 border-[var(--error)] bg-[var(--surface-container-high)] p-4">
        <p className="text-sm italic leading-7 text-[var(--on-surface)]">
          &quot;{caseItem.flaggedMessage}&quot;
        </p>
      </div>
      <div className="mt-3 flex items-center justify-between text-[10px]">
        <span className="text-[var(--on-surface-variant)]">{caseItem.openedAt}</span>
        <span className="font-bold text-[var(--secondary)]">
          Harmful score {Math.round(caseItem.harmfulScore * 100)}%
        </span>
      </div>
    </div>
  );
}
