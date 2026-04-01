import type { CaseDecision } from "@/types/mockdata/cases";

type CaseActionsProps = {
  isResolved: boolean;
  decision: CaseDecision;
  onDismiss: () => void;
  onPunish: () => void;
};

export default function CaseActions({
  isResolved,
  decision,
  onDismiss,
  onPunish,
}: CaseActionsProps) {
  if (isResolved) {
    return (
      <div className="border-t border-[color:color-mix(in_srgb,var(--outline-variant)_20%,transparent)] pt-4">
        <div className="rounded-xl bg-[var(--surface-container-highest)] px-4 py-3 text-center text-sm font-bold text-[var(--on-surface)]">
          Verdict-{decision ?? "Resolved"}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 border-t border-[color:color-mix(in_srgb,var(--outline-variant)_20%,transparent)] pt-4">
      <button
        type="button"
        onClick={onDismiss}
        className="flex-1 rounded-xl bg-[var(--surface-container-highest)] py-3 text-sm font-bold text-[var(--on-surface)] transition-colors hover:bg-[var(--surface-bright)] disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:bg-[var(--surface-container-highest)]"
      >
        Dismiss
      </button>
      <button
        type="button"
        onClick={onPunish}
        className="flex-1 rounded-xl bg-gradient-to-br from-[#ff6b6b] to-[var(--error)] py-3 text-sm font-bold text-[var(--on-error-container)] shadow-[0_6px_12px_rgba(147,0,10,0.09)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-55flex-1 rounded-xl border border-[#b91c1c] bg-gradient-to-b from-[#ef4444] to-[#dc2626] py-3 text-sm font-bold text-white shadow-[0_3px_8px_rgba(127,29,29,0.16)] transition-[transform,box-shadow,filter] hover:brightness-105 hover:shadow-[0_5px_12px_rgba(127,29,29,0.2)] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:shadow-[0_3px_8px_rgba(127,29,29,0.16)]"
      >
        Vote: Punish
      </button>
    </div>
  );
}
