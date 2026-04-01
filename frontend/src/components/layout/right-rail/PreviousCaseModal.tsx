"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import type { CaseRecord } from "@/types/mockdata/cases";

type PreviousCaseModalProps = {
  caseItem: CaseRecord | null;
  onClose: () => void;
};

export default function PreviousCaseModal({
  caseItem,
  onClose,
}: PreviousCaseModalProps) {
  useEffect(() => {
    if (!caseItem) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", handleEscape);
    };
  }, [caseItem, onClose]);

  if (!caseItem) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-[rgba(2,3,6,0.76)] px-6 py-8 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="premium-scrollbar max-h-full w-full max-w-3xl overflow-y-auto rounded-[1.75rem] border border-[color:color-mix(in_srgb,var(--outline-variant)_30%,transparent)] bg-[var(--surface-container)] p-6 shadow-[0_24px_80px_rgba(3,8,20,0.6)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--on-surface-variant)]">
              Previous Case
            </p>
            <h3 className="font-headline text-2xl font-semibold text-[var(--on-surface)]">
              {caseItem.title}
            </h3>
            <p className="mt-2 text-sm text-[var(--on-surface-variant)]">
              {caseItem.aiReason}
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl bg-[var(--surface-container-high)] p-2 text-[var(--on-surface-variant)] transition-colors hover:text-[var(--on-surface)]"
            aria-label="Close case details"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-[var(--surface-container-high)] p-4">
            <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--on-surface-variant)]">
              Status
            </p>
            <p className="mt-2 text-base font-semibold text-[var(--primary)]">
              {caseItem.status}
            </p>
          </div>
          <div className="rounded-2xl bg-[var(--surface-container-high)] p-4">
            <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--on-surface-variant)]">
              Vote Breakdown
            </p>
            <p className="mt-2 text-base font-semibold text-[var(--on-surface)]">
              {caseItem.voteBreakdown}
            </p>
          </div>
          <div className="rounded-2xl bg-[var(--surface-container-high)] p-4">
            <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--on-surface-variant)]">
              Opened
            </p>
            <p className="mt-2 text-sm text-[var(--on-surface)]">
              {caseItem.openedAt}
            </p>
          </div>
          <div className="rounded-2xl bg-[var(--surface-container-high)] p-4">
            <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--on-surface-variant)]">
              Resolved
            </p>
            <p className="mt-2 text-sm text-[var(--on-surface)]">
              {caseItem.resolvedAt}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl bg-[var(--surface-container-high)] p-5">
            <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--on-surface-variant)]">
              Case Summary
            </p>
            <p className="mt-3 text-sm leading-7 text-[var(--on-surface)]">
              {caseItem.summary}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl bg-[var(--surface-container-high)] p-5">
              <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--on-surface-variant)]">
                Reporter
              </p>
              <p className="mt-3 text-sm font-semibold text-[var(--on-surface)]">
                {caseItem.reporter}
              </p>
            </div>
            <div className="rounded-2xl bg-[var(--surface-container-high)] p-5">
              <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--on-surface-variant)]">
                Target User
              </p>
              <p className="mt-3 text-sm font-semibold text-[var(--on-surface)]">
                {caseItem.offender}
              </p>
            </div>
          </div>

          <div className="rounded-2xl bg-[var(--surface-container-high)] p-5">
            <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--on-surface-variant)]">
              Flagged Message
            </p>
            <p className="mt-3 rounded-xl bg-[var(--surface-container-low)] px-4 py-4 text-sm leading-7 text-[var(--on-surface)]">
              {caseItem.flaggedMessage}
            </p>
          </div>

          <div className="rounded-2xl bg-[var(--surface-container-high)] p-5">
            <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--on-surface-variant)]">
              AI Reason
            </p>
            <p className="mt-3 text-sm leading-7 text-[var(--on-surface)]">
              {caseItem.aiReason}
            </p>
          </div>

          <div className="rounded-2xl bg-[var(--surface-container-high)] p-5">
            <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--on-surface-variant)]">
              Outcome
            </p>
            <p className="mt-3 text-sm leading-7 text-[var(--on-surface)]">
              {caseItem.outcome}
            </p>
          </div>

          <div className="rounded-2xl bg-[var(--surface-container-high)] p-5">
            <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--on-surface-variant)]">
              Notes
            </p>
            <div className="mt-3 space-y-2">
              <div className="rounded-xl bg-[var(--surface-container-low)] px-4 py-3 text-sm text-[var(--on-surface-variant)]">
                No additional notes for this case.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
