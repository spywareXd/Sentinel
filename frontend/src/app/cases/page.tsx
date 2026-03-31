"use client";

import { useMemo, useState } from "react";
import CaseDetailPanel from "@/components/cases/CaseDetailPanel";
import CasesHeader from "@/components/cases/CasesHeader";
import CaseList from "@/components/cases/CaseList";
import CasesSummaryStrip from "@/components/cases/CasesSummaryStrip";
import Sidebar from "@/components/layout/Sidebar";
import { caseRecords } from "@/mockdata/cases";

type TopTab = "Active" | "Pending" | "Resolved";
type QueueFilter = "Assigned" | "Active" | "Resolved" | "All";

export default function CasesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTopTab, setActiveTopTab] = useState<TopTab>("Pending");
  const [queueFilter, setQueueFilter] = useState<QueueFilter>("Assigned");
  const [quickFilters, setQuickFilters] = useState({
    highSeverity: false,
    needsVote: false,
  });
  const [selectedCaseId, setSelectedCaseId] = useState(caseRecords[0]?.id ?? "");

  const filteredCases = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return caseRecords.filter((caseItem) => {
      if (activeTopTab === "Active" && caseItem.status !== "Voting") return false;
      if (activeTopTab === "Pending" && caseItem.status === "Resolved") return false;
      if (activeTopTab === "Resolved" && caseItem.status !== "Resolved") return false;

      if (queueFilter === "Assigned" && !caseItem.assignedToMe) return false;
      if (queueFilter === "Active" && caseItem.status === "Resolved") return false;
      if (queueFilter === "Resolved" && caseItem.status !== "Resolved") return false;

      if (quickFilters.highSeverity && caseItem.severity !== "High") return false;
      if (quickFilters.needsVote && !caseItem.needsVote) return false;

      if (!normalizedQuery) return true;

      const searchableText = [
        caseItem.number,
        caseItem.title,
        caseItem.offender,
        caseItem.reporter,
        caseItem.aiReason,
      ]
        .join(" ")
        .toLowerCase();

      return searchableText.includes(normalizedQuery);
    });
  }, [activeTopTab, queueFilter, quickFilters, searchQuery]);

  const selectedCase =
    filteredCases.find((caseItem) => caseItem.id === selectedCaseId) ??
    filteredCases[0] ??
    caseRecords[0];

  const summary = useMemo(
    () => ({
      assigned: caseRecords.filter((caseItem) => caseItem.assignedToMe).length,
      activeVoting: caseRecords.filter((caseItem) => caseItem.status !== "Resolved").length,
      resolved: caseRecords.filter((caseItem) => caseItem.status === "Resolved").length,
      punished: caseRecords.filter((caseItem) => caseItem.decision === "Punished").length,
      dismissed: caseRecords.filter((caseItem) => caseItem.decision === "Dismissed").length,
    }),
    [],
  );

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--background)]">
      <Sidebar />

      <main className="ml-0 flex min-h-0 min-w-0 flex-1 flex-col">
        <CasesHeader
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          activeTopTab={activeTopTab}
          onTopTabChange={setActiveTopTab}
        />

        <div className="grid min-h-0 flex-1 grid-cols-12 gap-8 overflow-y-auto p-8">
          <div className="col-span-12 flex flex-col gap-8 xl:col-span-8">
            <section className="flex flex-col gap-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <h3 className="font-headline text-4xl font-extrabold tracking-tight text-[var(--on-surface)]">
                    Cases
                  </h3>
                  <p className="text-[var(--on-surface-variant)]">
                    Live moderation queue and community archive •{" "}
                    <span className="font-semibold text-[var(--primary)]">
                      {summary.assigned} assigned to you
                    </span>
                  </p>
                </div>
              </div>

              <CasesSummaryStrip {...summary} />
            </section>

            <CaseList
              cases={filteredCases}
              selectedCaseId={selectedCase?.id ?? ""}
              onSelectCase={setSelectedCaseId}
              queueFilter={queueFilter}
              onQueueFilterChange={setQueueFilter}
              quickFilters={quickFilters}
              onToggleQuickFilter={(filter) =>
                setQuickFilters((prev) => ({
                  ...prev,
                  [filter]: !prev[filter],
                }))
              }
            />
          </div>

          <div className="col-span-12 xl:col-span-4">
            {selectedCase ? (
              <CaseDetailPanel caseItem={selectedCase} />
            ) : (
              <div className="rounded-3xl bg-[var(--surface-container-low)] p-6 text-sm text-[var(--on-surface-variant)]">
                No cases match your current filters.
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
