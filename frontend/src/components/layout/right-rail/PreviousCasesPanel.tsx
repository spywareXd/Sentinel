"use client";

import { useMemo, useState } from "react";
import { previousCases } from "@/mockdata/room";
import PreviousCaseModal from "@/components/layout/right-rail/PreviousCaseModal";

export default function PreviousCasesPanel() {
  const [openCaseId, setOpenCaseId] = useState<string | null>(null);

  const activeCase = useMemo(
    () =>
      previousCases.find((previousCase) => previousCase.id === openCaseId) ??
      null,
    [openCaseId],
  );

  return (
    <>
      <div id="room-previous-cases" className="scroll-mt-6 space-y-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--on-surface-variant)]">
          Previous Cases
        </p>

        {previousCases.map((previousCase) => (
          <button
            key={previousCase.id}
            onClick={() => setOpenCaseId(previousCase.id)}
            className="block w-full rounded-xl bg-[var(--surface-container-low)] p-3 text-left transition-colors hover:bg-[var(--surface-container-high)]"
          >
            <p className="text-[11px] font-bold text-[var(--on-surface)]">
              {previousCase.title}
            </p>
            <p className="mt-1 text-[10px] text-[var(--on-surface-variant)]">
              {previousCase.subtitle}
            </p>
          </button>
        ))}
      </div>

      <PreviousCaseModal
        caseItem={activeCase}
        onClose={() => setOpenCaseId(null)}
      />
    </>
  );
}
