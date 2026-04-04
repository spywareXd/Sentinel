"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import CaseDetailPanel from "@/components/cases/CaseDetailPanel";
import CasesHeader from "@/components/cases/CasesHeader";
import CaseList from "@/components/cases/CaseList";
import CasesSummaryStrip from "@/components/cases/CasesSummaryStrip";
import Sidebar from "@/components/layout/Sidebar";
import type { CaseDecision, CaseRecord } from "@/types/mockdata/cases";
import { createClient } from "@/utils/supabase/client";

type TopTab = "Assigned" | "History";

const toTitleCase = (value: string) =>
  value
    .replace(/[_-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const getSeverity = (harmfulScore: number, severeScore: number) => {
  if (severeScore >= 0.75 || harmfulScore >= 0.8) return "High";
  if (severeScore >= 0.45 || harmfulScore >= 0.5) return "Medium";
  return "Low";
};

const formatTimestamp = (value?: string | null) => {
  if (!value) return undefined;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;

  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const mapDecision = (decision?: string | null): CaseDecision => {
  if (decision === "punish") return "Punished";
  if (decision === "dismiss") return "Dismissed";
  return null;
};

const mapStatus = (status?: string | null) =>
  status === "resolved" ? "Resolved" : "Assigned";

interface DbCase {
  id: string | number;
  blockchain_case_id?: number | null;
  decision?: string | null;
  status?: string | null;
  created_at?: string;
  updated_at?: string;
  messages?: {
    harmful_score?: number;
    severe_score?: number;
    reason?: string;
    content?: string;
  };
  offender?: {
    username?: string;
    wallet_address?: string;
  };
  on_chain?: {
    vote_count?: number;
  };
  toxicity_score?: number;
}

const mapCaseRecord = (dbCase: DbCase): CaseRecord => {
  const harmfulScore = dbCase.messages?.harmful_score ?? dbCase.toxicity_score ?? 0;
  const severeScore = dbCase.messages?.severe_score ?? 0;
  const decision = mapDecision(dbCase.decision);
  const status = mapStatus(dbCase.status);
  const openedAt = formatTimestamp(dbCase.created_at) ?? "Recently opened";
  const resolvedAt = formatTimestamp(dbCase.updated_at);
  const reason = dbCase.messages?.reason || "flagged content";
  const offenderName =
    dbCase.offender?.username ||
    dbCase.offender?.wallet_address?.slice(0, 10) ||
    "Unknown user";

  return {
    id: String(dbCase.id),
    number:
      dbCase.blockchain_case_id !== null && dbCase.blockchain_case_id !== undefined
        ? `#${dbCase.blockchain_case_id}`
        : `#${String(dbCase.id).slice(0, 6).toUpperCase()}`,
    title: toTitleCase(reason),
    category: toTitleCase(reason),
    severity: getSeverity(harmfulScore, severeScore),
    status,
    decision,
    openedAt,
    resolvedAt,
    assignedToMe: status !== "Resolved",
    wasAssignedToMe: true,
    needsVote: status !== "Resolved",
    harmfulScore,
    aiReason: reason,
    offender: offenderName,
    reporter: "Scanner",
    flaggedMessage: dbCase.messages?.content ?? "Original message unavailable.",
    summary:
      status === "Resolved"
        ? `This case has been resolved with a ${decision?.toLowerCase() ?? "recorded"} outcome.`
        : "This case is currently assigned to you for review.",
    voteBreakdown:
      dbCase.on_chain?.vote_count !== undefined
        ? `${dbCase.on_chain.vote_count}/3 votes cast`
        : "Vote data unavailable",
    outcome:
      status === "Resolved"
        ? `Final verdict: ${decision ?? "Resolved"}`
        : "Awaiting moderator decision.",
    chainRef:
      dbCase.blockchain_case_id !== null && dbCase.blockchain_case_id !== undefined
        ? `CHAIN-${dbCase.blockchain_case_id}`
        : "Pending chain sync",
    blockchainCaseId:
      dbCase.blockchain_case_id !== null && dbCase.blockchain_case_id !== undefined
        ? Number(dbCase.blockchain_case_id)
        : null,
  };
};

export default function CasesPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [activeTopTab, setActiveTopTab] = useState<TopTab>("Assigned");
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [isDetailDismissed, setIsDetailDismissed] = useState(false);
  const [searchQuery] = useState(""); // Restored searchQuery state

  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [moderatorWallet, setModeratorWallet] = useState("");
  const detailPanelRef = useRef<HTMLDivElement | null>(null);

  const filteredCases = useMemo(() => {
    return cases
      .filter((caseItem) => {
        if (activeTopTab === "Assigned") {
          return caseItem.assignedToMe;
        }
        return caseItem.status === "Resolved" && caseItem.wasAssignedToMe;
      })
      .filter((caseItem) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          caseItem.title.toLowerCase().includes(q) ||
          caseItem.id.toLowerCase().includes(q) ||
          caseItem.offender.toLowerCase().includes(q)
        );
      })
      .sort((left, right) => {
        if (left.status === "Resolved" && right.status !== "Resolved") return 1;
        if (left.status !== "Resolved" && right.status === "Resolved") return -1;
        if (left.assignedToMe && !right.assignedToMe) return -1;
        if (!left.assignedToMe && right.assignedToMe) return 1;
        return right.harmfulScore - left.harmfulScore;
      });
  }, [cases, activeTopTab, searchQuery]);

  // Syncing state during render to avoid cascading useEffect renders
  const [prevFiltered, setPrevFiltered] = useState(filteredCases);
  if (filteredCases !== prevFiltered) {
    setPrevFiltered(filteredCases);
    if (filteredCases.length === 0) {
      if (selectedCaseId !== null) setSelectedCaseId(null);
    } else {
      const hasSelected = filteredCases.some((c) => c.id === selectedCaseId);
      if (!selectedCaseId || !hasSelected) {
        if (selectedCaseId !== filteredCases[0].id) {
          setSelectedCaseId(filteredCases[0].id);
        }
      }
    }
  }

  const selectedCase =
    (selectedCaseId
      ? filteredCases.find((caseItem) => caseItem.id === selectedCaseId)
      : null) ??
    null;

  const summary = useMemo(
    () => ({
      assigned: cases.filter((caseItem) => caseItem.assignedToMe).length,
      resolved: cases.filter((caseItem) => caseItem.status === "Resolved").length,
    }),
    [cases],
  );

  useEffect(() => {
    const loadCases = async () => {
      setIsLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.push("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("wallet_address")
        .eq("id", user.id)
        .single();

      const walletAddress = profile?.wallet_address?.toLowerCase();
      setModeratorWallet(walletAddress ?? "");

      if (!walletAddress) {
        setCases([]);
        setSelectedCaseId(null);
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("moderation_cases")
        .select(
          "*, messages:message_id(content, harmful_score, severe_score, reason), offender:offender_id(username, wallet_address, warnings)"
        )
        .or(
          `moderator_1.eq.${walletAddress},moderator_2.eq.${walletAddress},moderator_3.eq.${walletAddress}`
        )
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading cases:", error);
        setCases([]);
        setSelectedCaseId(null);
        setIsLoading(false);
        return;
      }

      const mappedCases = (data ?? []).map(mapCaseRecord);
      setCases(mappedCases);
      setIsLoading(false);
    };

    void loadCases();
  }, [refreshKey, router, supabase]);

  const resolveCase = (caseId: string, decision: "Punished" | "Dismissed") => {
    setCases((currentCases) =>
      currentCases.map((caseItem) => {
        if (caseItem.id !== caseId || caseItem.status === "Resolved") {
          return caseItem;
        }

        const isPunish = decision === "Punished";

        return {
          ...caseItem,
          status: "Resolved" as const,
          decision,
          resolvedAt: "Resolved just now",
          assignedToMe: false,
          wasAssignedToMe: true,
          needsVote: false,
          outcome: isPunish
            ? "Case resolved with punishment after your vote pushed the room to a final decision."
            : "Case resolved with dismissal after your vote closed the review in favor of no punishment.",
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
        setIsDetailDismissed(true);
        setSelectedCaseId(null);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [selectedCaseId]);

  const resetCases = () => {
    setRefreshKey((currentKey) => currentKey + 1);
    setIsDetailDismissed(false);
    setActiveTopTab("Assigned");
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--background)]">
      <Sidebar />

      <main className="ml-0 flex min-h-0 min-w-0 flex-1 flex-col">
        <CasesHeader
          activeTopTab={activeTopTab}
          onTopTabChange={(tab) => {
            setActiveTopTab(tab);
            setIsDetailDismissed(false);
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
                    Only your assigned queue and your past decisions live here •{" "}
                    <span className="font-semibold text-[var(--primary)]">
                      {summary.assigned} assigned to you
                    </span>
                  </p>
                </div>
                <button
                  onClick={resetCases}
                  className="rounded-full bg-[var(--surface-container-high)] px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[var(--on-surface)] transition-colors hover:bg-[var(--surface-container-highest)]"
                >
                  Refresh Cases
                </button>
              </div>

              <CasesSummaryStrip {...summary} />
            </section>

            {isLoading ? (
              <div className="rounded-3xl bg-[var(--surface-container-low)] p-6 text-sm text-[var(--on-surface-variant)]">
                Loading your assigned cases...
              </div>
            ) : (
              <CaseList
                cases={filteredCases}
                selectedCaseId={selectedCase?.id ?? ""}
                onSelectCase={(caseId) => {
                  setSelectedCaseId(caseId);
                  setIsDetailDismissed(false);
                }}
              />
            )}
          </div>

          <div className="col-span-12 xl:col-span-4">
            {selectedCase ? (
              <div ref={detailPanelRef}>
                <CaseDetailPanel
                  caseItem={selectedCase}
                  moderatorAddress={moderatorWallet}
                  onVoteSuccess={(decision) => resolveCase(selectedCase.id, decision)}
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
