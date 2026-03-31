"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import CaseDetailPanel from "@/components/cases/CaseDetailPanel";
import CasesHeader from "@/components/cases/CasesHeader";
import CaseList from "@/components/cases/CaseList";
import CasesSummaryStrip from "@/components/cases/CasesSummaryStrip";
import Sidebar from "@/components/layout/Sidebar";
import { caseRecords } from "@/mockdata/cases";
import type { CaseDecision, CaseRecord } from "@/types/mockdata/cases";

type TopTab = "Active" | "Pending" | "Resolved";
type QueueFilter = "Assigned" | "Active" | "Resolved" | "All";

const createInitialCases = () => caseRecords.map((caseItem) => ({ ...caseItem }));

const getTopTabForQueueFilter = (filter: QueueFilter): TopTab => {
  if (filter === "Resolved") return "Resolved";
  if (filter === "Active") return "Active";
  return "Pending";
};

const getQueueFilterForTopTab = (tab: TopTab): QueueFilter => {
  if (tab === "Resolved") return "Resolved";
  if (tab === "Active") return "Active";
  return "Assigned";
};

export default function CasesPage() {
  const [cases, setCases] = useState<CaseRecord[]>(createInitialCases);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTopTab, setActiveTopTab] = useState<TopTab>("Pending");
  const [queueFilter, setQueueFilter] = useState<QueueFilter>("Assigned");
  const [quickFilters, setQuickFilters] = useState({
    highSeverity: false,
    needsVote: false,
  });
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(
    caseRecords[0]?.id ?? null,
  );
  const detailPanelRef = useRef<HTMLDivElement | null>(null);

  const filteredCases = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return cases
      .filter((caseItem) => {
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
      })
      .sort((left, right) => {
        if (left.status === "Resolved" && right.status !== "Resolved") return 1;
        if (left.status !== "Resolved" && right.status === "Resolved") return -1;
        if (left.assignedToMe && !right.assignedToMe) return -1;
        if (!left.assignedToMe && right.assignedToMe) return 1;
        return right.harmfulScore - left.harmfulScore;
      });
  }, [activeTopTab, cases, queueFilter, quickFilters, searchQuery]);

  const selectedCase =
    (selectedCaseId
      ? filteredCases.find((caseItem) => caseItem.id === selectedCaseId)
      : null) ??
    null;

  const summary = useMemo(
    () => ({
      assigned: cases.filter((caseItem) => caseItem.assignedToMe).length,
      activeVoting: cases.filter((caseItem) => caseItem.status !== "Resolved").length,
      resolved: cases.filter((caseItem) => caseItem.status === "Resolved").length,
      punished: cases.filter((caseItem) => caseItem.decision === "Punished").length,
      dismissed: cases.filter((caseItem) => caseItem.decision === "Dismissed").length,
    }),
    [cases],
  );

  const resolveCase = (caseId: string, decision: Exclude<CaseDecision, null>) => {
    setCases((currentCases) =>
      currentCases.map((caseItem) => {
        if (caseItem.id !== caseId || caseItem.status === "Resolved") {
          return caseItem;
        }

        const isPunish = decision === "Punished";

        return {
          ...caseItem,
          status: "Resolved",
          decision,
          resolvedAt: "Resolved just now",
          assignedToMe: false,
          needsVote: false,
          outcome: isPunish
            ? "Case resolved with punishment after your vote pushed the room to a final decision."
            : "Case resolved with dismissal after your vote closed the review in favor of no punishment.",
          notes: [
            isPunish
              ? "You voted to punish and the case closed immediately."
              : "You voted to dismiss and the case closed immediately.",
            ...caseItem.notes,
          ],
        };
      }),
    );
  };

  useEffect(() => {
    if (!selectedCaseId) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;

      if (
        detailPanelRef.current &&
        !detailPanelRef.current.contains(event.target) &&
        !event.target.closest("[data-case-list-root='true']")
      ) {
        setSelectedCaseId(null);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [selectedCaseId]);

  const resetCases = () => {
    setCases(createInitialCases());
    setSelectedCaseId(caseRecords[0]?.id ?? null);
    setActiveTopTab("Pending");
    setQueueFilter("Assigned");
    setQuickFilters({
      highSeverity: false,
      needsVote: false,
    });
    setSearchQuery("");
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--background)]">
      <Sidebar />

      <main className="ml-0 flex min-h-0 min-w-0 flex-1 flex-col">
        <CasesHeader
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          activeTopTab={activeTopTab}
          onTopTabChange={(tab) => {
            setActiveTopTab(tab);
            setQueueFilter(getQueueFilterForTopTab(tab));
          }}
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
                <button
                  onClick={resetCases}
                  className="rounded-full bg-[var(--surface-container-high)] px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[var(--on-surface)] transition-colors hover:bg-[var(--surface-container-highest)]"
                >
                  Reset Mock Cases
                </button>
              </div>

              <CasesSummaryStrip {...summary} />
            </section>

            <CaseList
              cases={filteredCases}
              selectedCaseId={selectedCase?.id ?? ""}
              onSelectCase={setSelectedCaseId}
              queueFilter={queueFilter}
              onQueueFilterChange={(filter) => {
                setQueueFilter(filter);
                setActiveTopTab(getTopTabForQueueFilter(filter));
              }}
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
              <div ref={detailPanelRef}>
                <CaseDetailPanel
                  caseItem={selectedCase}
                  onDismiss={() => resolveCase(selectedCase.id, "Dismissed")}
                  onPunish={() => resolveCase(selectedCase.id, "Punished")}
                />
              </div>
            ) : (
              <div className="rounded-3xl bg-[var(--surface-container-low)] p-6 text-sm text-[var(--on-surface-variant)]">
                Select a case to inspect its moderation details.
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
