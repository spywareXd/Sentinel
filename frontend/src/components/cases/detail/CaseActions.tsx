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
        onClick={onDismiss}
        className="flex-1 rounded-xl bg-[var(--surface-container-highest)] py-3 text-sm font-bold text-[var(--on-surface)] transition-colors hover:bg-[var(--surface-bright)] disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:bg-[var(--surface-container-highest)]"
      >
        Dismiss
      </button>
      <button
        onClick={onPunish}
        className="flex-1 rounded-xl bg-gradient-to-br from-[#ff6b6b] to-[var(--error)] py-3 text-sm font-bold text-[var(--on-error-container)] shadow-[0_6px_12px_rgba(147,0,10,0.09)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-55"
      >
        Vote: Punish
      </button>
    </div>
  );
}
