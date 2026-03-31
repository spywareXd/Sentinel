import type { CaseRecord } from "@/types/mockdata/cases";

type CaseVoteProgressProps = {
  caseItem: CaseRecord;
};

export default function CaseVoteProgress({ caseItem }: CaseVoteProgressProps) {
  return (
    <div id="cases-jurors" className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--on-surface-variant)]">
          Vote Progress
        </p>
        <span className="text-[10px] font-black text-[var(--on-surface)]">
          {caseItem.voteBreakdown.toUpperCase()}
        </span>
      </div>

      <div className="overflow-hidden rounded-2xl bg-[var(--surface-container-lowest)]">
        <div className="flex h-10">
          <div className="flex w-[78%] items-center bg-[color:color-mix(in_srgb,var(--error)_60%,transparent)] px-3">
            <span className="text-[10px] font-black uppercase text-[var(--on-error-container)]">
              Punish leaning
            </span>
          </div>
          <div className="flex w-[22%] items-center justify-end bg-[var(--surface-variant)] px-3">
            <span className="text-[10px] font-black uppercase text-[var(--on-surface)]">
              Dismiss
            </span>
          </div>
        </div>
      </div>

      <p className="text-[10px] leading-6 text-[var(--on-surface-variant)]">
        {caseItem.outcome}
      </p>
    </div>
  );
}
