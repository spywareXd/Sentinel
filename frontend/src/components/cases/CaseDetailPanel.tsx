import { CaseRecord } from "@/types/mockdata/cases";

type CaseDetailPanelProps = {
  caseItem: CaseRecord;
};

const statusTone = {
  Assigned: "bg-[color:color-mix(in_srgb,var(--error)_18%,transparent)] text-[var(--error)]",
  Voting:
    "bg-[color:color-mix(in_srgb,var(--secondary)_18%,transparent)] text-[var(--secondary)]",
  Resolved:
    "bg-[color:color-mix(in_srgb,var(--tertiary)_18%,transparent)] text-[var(--tertiary)]",
} as const;

export default function CaseDetailPanel({ caseItem }: CaseDetailPanelProps) {
  return (
    <aside
      id="cases-details-top"
      className="sticky top-24 flex h-[calc(100vh-8rem)] flex-col gap-6 rounded-[1.75rem] border border-[color:color-mix(in_srgb,var(--outline-variant)_25%,transparent)] bg-[color:color-mix(in_srgb,var(--surface-container-highest)_45%,transparent)] p-6 backdrop-blur-xl"
    >
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
          {caseItem.assignedToMe ? "Assigned to: You" : `Reporter: ${caseItem.reporter}`} •{" "}
          {caseItem.category}
        </p>
      </div>

      <div className="premium-scrollbar flex-1 space-y-6 overflow-y-auto pr-2">
        <div
          id="cases-about"
          className="rounded-2xl bg-[var(--surface-container-lowest)] p-4"
        >
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--on-surface-variant)]">
            Flagged Message
          </p>
          <div className="rounded-xl border-l-2 border-[var(--error)] bg-[var(--surface-container-high)] p-4">
            <p className="text-sm italic leading-7 text-[var(--on-surface)]">
              "{caseItem.flaggedMessage}"
            </p>
          </div>
          <div className="mt-3 flex items-center justify-between text-[10px]">
            <span className="text-[var(--on-surface-variant)]">{caseItem.openedAt}</span>
            <span className="font-bold text-[var(--secondary)]">
              Harmful score {Math.round(caseItem.harmfulScore * 100)}%
            </span>
          </div>
        </div>

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

        <div className="space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--on-surface-variant)]">
            Notes
          </p>
          {caseItem.notes.map((note) => (
            <div
              key={note}
              className="rounded-xl bg-[var(--surface-container-low)] px-4 py-3 text-sm text-[var(--on-surface)]"
            >
              {note}
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3 border-t border-[color:color-mix(in_srgb,var(--outline-variant)_20%,transparent)] pt-4">
        <button className="flex-1 rounded-xl bg-[var(--surface-container-highest)] py-3 text-sm font-bold text-[var(--on-surface)] transition-colors hover:bg-[var(--surface-bright)]">
          Dismiss
        </button>
        <button className="flex-1 rounded-xl bg-gradient-to-br from-[#ff6b6b] to-[var(--error)] py-3 text-sm font-bold text-[var(--on-error-container)] shadow-[0_16px_30px_rgba(147,0,10,0.22)] transition-opacity hover:opacity-90">
          Vote: Punish
        </button>
      </div>
    </aside>
  );
}
