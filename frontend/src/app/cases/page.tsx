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
const LOCAL_BACKEND_URL = "http://localhost:8000";
const LOCAL_RECORDED_VOTES_KEY = "sentinel:recorded-on-chain-votes";
const REASON_SEPARATOR = "|||";

type LocalRecordedVote = {
  decision: "Punished" | "Dismissed";
  recordedAt: string;
};

type LocalRecordedVoteCache = Record<string, LocalRecordedVote>;

const isLocalHostname = (hostname: string) =>
  hostname === "localhost" || hostname === "127.0.0.1";

const normalizeUrl = (value?: string | null) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

const isLoopbackUrl = (value?: string | null) => {
  if (!value) return false;

  try {
    const hostname = new URL(value).hostname.toLowerCase();
    return hostname === "localhost" || hostname === "127.0.0.1";
  } catch {
    return false;
  }
};

const isInsecureHttpUrl = (value?: string | null) => {
  if (!value) return false;

  try {
    return new URL(value).protocol === "http:";
  } catch {
    return false;
  }
};

const needsTunnelBypassHeader = (value: string) => {
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    return hostname === "loca.lt" || hostname.endsWith(".loca.lt");
  } catch {
    return false;
  }
};

const getBackendCandidates = () => {
  const configuredUrl = normalizeUrl(process.env.NEXT_PUBLIC_BACKEND_URL);
  const hostname = typeof window !== "undefined" ? window.location.hostname : "";
  const protocol = typeof window !== "undefined" ? window.location.protocol : "";
  const runningLocally = isLocalHostname(hostname);
  const runningOnSecurePage = protocol === "https:";

  if (!configuredUrl) {
    return runningLocally ? [LOCAL_BACKEND_URL] : [];
  }

  if (!runningLocally && isLoopbackUrl(configuredUrl)) {
    return [];
  }

  if (!runningLocally && runningOnSecurePage && isInsecureHttpUrl(configuredUrl)) {
    return [];
  }

  if (configuredUrl === LOCAL_BACKEND_URL || !runningLocally) {
    return [configuredUrl];
  }

  return [configuredUrl, LOCAL_BACKEND_URL];
};

const getBackendConfigError = () => {
  const configuredUrl = normalizeUrl(process.env.NEXT_PUBLIC_BACKEND_URL);
  const hostname = typeof window !== "undefined" ? window.location.hostname : "";
  const protocol = typeof window !== "undefined" ? window.location.protocol : "";
  const runningLocally = isLocalHostname(hostname);
  const runningOnSecurePage = protocol === "https:";

  if (!runningLocally && isLoopbackUrl(configuredUrl)) {
    return "The deployed frontend bundle is pointing at localhost for the backend. Set NEXT_PUBLIC_BACKEND_URL to a public HTTPS backend URL in Vercel and redeploy.";
  }

  if (!runningLocally && runningOnSecurePage && isInsecureHttpUrl(configuredUrl)) {
    return "The deployed frontend bundle is pointing at an insecure HTTP backend URL. Set NEXT_PUBLIC_BACKEND_URL to a public HTTPS backend URL in Vercel and redeploy.";
  }

  if (configuredUrl || runningLocally) {
    return null;
  }

  return "No public backend URL is configured in the deployed frontend bundle. Set NEXT_PUBLIC_BACKEND_URL in Vercel and redeploy.";
};

const buildRecordedVoteCacheKey = (walletAddress: string, caseId: string) =>
  `${walletAddress}:${caseId}`;

const readRecordedVoteCache = (): LocalRecordedVoteCache => {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.localStorage.getItem(LOCAL_RECORDED_VOTES_KEY);
    if (!raw) return {};

    const parsed = JSON.parse(raw) as LocalRecordedVoteCache;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (err) {
    console.error("Could not read locally recorded votes cache:", err);
    return {};
  }
};

const writeRecordedVoteCache = (cache: LocalRecordedVoteCache) => {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(
    LOCAL_RECORDED_VOTES_KEY,
    JSON.stringify(cache),
  );
};

const rememberRecordedVote = (
  walletAddress: string,
  caseId: string,
  decision: "Punished" | "Dismissed",
) => {
  if (!walletAddress) return;

  const cache = readRecordedVoteCache();
  cache[buildRecordedVoteCacheKey(walletAddress, caseId)] = {
    decision,
    recordedAt: new Date().toISOString(),
  };
  writeRecordedVoteCache(cache);
};

const forgetRecordedVote = (walletAddress: string, caseId: string) => {
  if (!walletAddress) return;

  const cache = readRecordedVoteCache();
  const cacheKey = buildRecordedVoteCacheKey(walletAddress, caseId);

  if (!(cacheKey in cache)) return;

  delete cache[cacheKey];
  writeRecordedVoteCache(cache);
};

const toTitleCase = (value: string) =>
  value
    .replace(/[_-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const summarizeReasonHeadline = (value?: string | null) => {
  const normalized = value?.trim();
  if (!normalized) return "Flagged Content";

  const words = normalized
    .replace(/[_-]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3);

  return words.length ? toTitleCase(words.join(" ")) : "Flagged Content";
};

const splitAiReason = (value?: string | null) => {
  const normalized = value?.trim();
  if (!normalized) {
    return {
      summary: "Flagged Content",
      detail: "No reason provided",
    };
  }

  if (normalized.includes(REASON_SEPARATOR)) {
    const [summaryPart, detailPart] = normalized.split(REASON_SEPARATOR, 2);
    const summary = summaryPart?.trim() || summarizeReasonHeadline(detailPart);
    const detail = detailPart?.trim() || normalized;
    return {
      summary,
      detail,
    };
  }

  return {
    summary: summarizeReasonHeadline(normalized),
    detail: normalized,
  };
};

const getSeverity = (harmfulScore: number, severeScore: number) => {
  const severityPercent = Math.round(
    Math.max(harmfulScore, severeScore) * 100,
  );

  if (severityPercent >= 100) return "Extreme";
  if (severityPercent >= 80) return "High";
  if (severityPercent >= 50) return "Medium";
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

const getTimestamp = (value?: string | null) => {
  if (!value) return 0;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
};

const mapDecision = (decision?: string | null): CaseDecision => {
  if (decision === "punish") return "Punished";
  if (decision === "dismiss") return "Dismissed";
  return null;
};

const mapStatus = (status?: string | null) =>
  status === "resolved" ? "Resolved" : status === "voting" ? "Voting" : "Assigned";

interface DbCase {
  id: string | number;
  message_id?: string | null;
  blockchain_case_id?: number | null;
  decision?: string | null;
  status?: string | null;
  created_at?: string;
  messages?: {
    content?: string;
  };
  ai_reason?: string | null;
  punishment_type?: string | null;
  punishment_duration?: number | null;
  tx_hash?: string | null;
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
  const harmfulScore = dbCase.toxicity_score ?? 0;
  const severeScore = dbCase.toxicity_score ?? 0;
  const decision = mapDecision(dbCase.decision);
  const status = mapStatus(dbCase.status);
  const openedAt = formatTimestamp(dbCase.created_at) ?? "Recently opened";
  const resolvedAt = status === "Resolved" ? "Resolved" : undefined;
  const parsedReason = splitAiReason(dbCase.ai_reason);
  const offenderName =
    dbCase.offender?.username ||
    dbCase.offender?.wallet_address?.slice(0, 10) ||
    "Unknown user";

  return {
    id: String(dbCase.id),
    messageId: dbCase.message_id ? String(dbCase.message_id) : null,
    number:
      dbCase.blockchain_case_id !== null && dbCase.blockchain_case_id !== undefined
        ? `#${dbCase.blockchain_case_id}`
        : `#${String(dbCase.id).slice(0, 6).toUpperCase()}`,
    createdAtTimestamp: getTimestamp(dbCase.created_at),
    title: toTitleCase(parsedReason.summary),
    category: toTitleCase(parsedReason.summary),
    severity: getSeverity(harmfulScore, severeScore),
    status,
    decision,
    openedAt,
    resolvedAt,
    assignedToMe: status !== "Resolved",
    wasAssignedToMe: true,
    needsVote: status !== "Resolved",
    harmfulScore,
    aiReason: parsedReason.detail,
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
    punishmentType: dbCase.punishment_type ?? null,
    punishmentDuration: dbCase.punishment_duration ?? null,
    txHash: dbCase.tx_hash ?? null,
  };
};

const moveCaseToHistoryAfterRecordedVote = (
  caseItem: CaseRecord,
  decision?: "Punished" | "Dismissed",
): CaseRecord => {
  if (caseItem.status === "Resolved") {
    return caseItem;
  }

  const votePhrase =
    decision === "Punished"
      ? "punishment"
      : decision === "Dismissed"
        ? "dismissal"
        : "your decision";

  return {
    ...caseItem,
    status: "Backend Error",
    assignedToMe: false,
    wasAssignedToMe: true,
    needsVote: false,
    resolvedAt: "Backend Error",
    summary:
      "Your vote is already recorded on-chain, but Sentinel hit a backend error while syncing this case. Final decision is still pending.",
    voteBreakdown:
      "Your vote is already recorded on-chain. Backend sync error; final tally pending.",
    outcome: `The blockchain already accepted ${votePhrase}, but backend registration failed. Final verdict pending.`,
  };
};

const applyRecordedVoteFallback = (
  walletAddress: string,
  caseItems: CaseRecord[],
) => {
  if (typeof window === "undefined" || !walletAddress) {
    return caseItems;
  }

  const cache = readRecordedVoteCache();
  const caseIds = new Set(caseItems.map((caseItem) => caseItem.id));
  let didMutateCache = false;

  for (const cacheKey of Object.keys(cache)) {
    if (!cacheKey.startsWith(`${walletAddress}:`)) continue;

    const caseId = cacheKey.slice(walletAddress.length + 1);
    if (!caseIds.has(caseId)) {
      delete cache[cacheKey];
      didMutateCache = true;
    }
  }

  const nextCases = caseItems.map((caseItem) => {
    const cacheKey = buildRecordedVoteCacheKey(walletAddress, caseItem.id);
    const cachedVote = cache[cacheKey];

    if (!cachedVote) {
      return caseItem;
    }

    if (caseItem.status === "Resolved" || !caseItem.assignedToMe) {
      delete cache[cacheKey];
      didMutateCache = true;
      return caseItem;
    }

    return moveCaseToHistoryAfterRecordedVote(caseItem, cachedVote.decision);
  });

  if (didMutateCache) {
    writeRecordedVoteCache(cache);
  }

  return nextCases;
};

export default function CasesPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [activeTopTab, setActiveTopTab] = useState<TopTab>("Assigned");
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [searchQuery] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [moderatorWallet, setModeratorWallet] = useState("");
  const detailPanelRef = useRef<HTMLDivElement | null>(null);

  const filteredCases = useMemo(() => {
    return cases
      .filter((caseItem) => {
        if (activeTopTab === "Assigned") {
          return caseItem.assignedToMe;
        }
        return caseItem.wasAssignedToMe && !caseItem.assignedToMe;
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
      .sort((left, right) => right.createdAtTimestamp - left.createdAtTimestamp);
  }, [cases, activeTopTab, searchQuery]);

  const selectedCase =
    (selectedCaseId
      ? filteredCases.find((caseItem) => caseItem.id === selectedCaseId)
      : null) ??
    filteredCases[0] ??
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
      setLoadError(null);
      try {
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
          .maybeSingle();

        const walletAddress = (
          profile?.wallet_address ||
          user.user_metadata?.wallet_address ||
          ""
        ).toLowerCase();
        setModeratorWallet(walletAddress);

        if (!walletAddress) {
          setCases([]);
          setSelectedCaseId(null);
          return;
        }

        let payload: { cases?: DbCase[] } | null = null;
        let lastFailure: unknown = null;
        const backendCandidates = getBackendCandidates();
        const backendConfigError = getBackendConfigError();

        if (backendCandidates.length === 0) {
          lastFailure = backendConfigError ?? "No backend candidates available.";
          console.error("Network error loading cases:", lastFailure);
          setLoadError(String(lastFailure));
          setCases([]);
          setSelectedCaseId(null);
          return;
        }

        for (const baseUrl of backendCandidates) {
          try {
            const resp = await fetch(
              `${baseUrl}/moderation/my-cases?wallet_address=${encodeURIComponent(walletAddress)}`,
              {
                cache: "no-store",
                ...(needsTunnelBypassHeader(baseUrl)
                  ? {
                      headers: {
                        "bypass-tunnel-reminder": "true",
                      },
                    }
                  : {}),
              },
            );

            if (!resp.ok) {
              lastFailure = await resp.text().catch(() => `HTTP ${resp.status}`);
              continue;
            }

            payload = (await resp.json()) as { cases?: DbCase[] };
            break;
          } catch (err) {
            lastFailure = err;
          }
        }

        if (!payload) {
          console.error("Network error loading cases:", lastFailure);
          setLoadError(
            backendConfigError ??
              (lastFailure instanceof Error
                ? lastFailure.message
                : String(lastFailure ?? "Could not load moderation cases.")),
          );
          setCases([]);
          setSelectedCaseId(null);
          return;
        }

        const mappedCases = applyRecordedVoteFallback(
          walletAddress,
          (payload.cases ?? []).map(mapCaseRecord),
        );
        setCases(mappedCases);
      } catch (err) {
        console.error("Network error loading cases:", err);
        setLoadError(err instanceof Error ? err.message : String(err));
        setCases([]);
        setSelectedCaseId(null);
      } finally {
        setIsLoading(false);
      }
    };

    void loadCases();
  }, [refreshKey, router, supabase]);

  const resolveCase = (caseId: string, decision: "Punished" | "Dismissed") => {
    forgetRecordedVote(moderatorWallet, caseId);
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

  const markCaseAsRecordedOnChain = (
    caseId: string,
    decision: "Punished" | "Dismissed",
  ) => {
    rememberRecordedVote(moderatorWallet, caseId, decision);
    setCases((currentCases) =>
      currentCases.map((caseItem) =>
        caseItem.id === caseId
          ? moveCaseToHistoryAfterRecordedVote(caseItem, decision)
          : caseItem,
      ),
    );
    setActiveTopTab("History");
    setSelectedCaseId(caseId);
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
    setRefreshKey((currentKey) => currentKey + 1);
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
          }}
        />

        <div className="grid min-h-0 flex-1 grid-cols-12 gap-8 overflow-hidden p-8">
          <div className="premium-scrollbar col-span-12 flex min-h-0 flex-col gap-8 overflow-y-auto pr-2 xl:col-span-8">
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
            ) : loadError ? (
              <div className="rounded-3xl border border-[var(--outline-variant)] bg-[var(--surface-container-low)] p-6 text-sm text-[var(--on-surface-variant)]">
                <p className="font-semibold text-[var(--on-surface)]">
                  Cases could not be loaded.
                </p>
                <p className="mt-2">{loadError}</p>
              </div>
            ) : (
              <CaseList
                cases={filteredCases}
                selectedCaseId={selectedCase?.id ?? ""}
                onSelectCase={(caseId) => {
                  setSelectedCaseId(caseId);
                }}
              />
            )}
          </div>

          <div className="col-span-12 min-h-0 xl:col-span-4">
            {selectedCase ? (
              <div ref={detailPanelRef} className="h-full">
                <CaseDetailPanel
                  caseItem={selectedCase}
                  moderatorAddress={moderatorWallet}
                  onVoteResolved={(decision) => {
                    resolveCase(selectedCase.id, decision);
                    setRefreshKey((currentKey) => currentKey + 1);
                  }}
                  onVoteRecorded={() => {
                    setRefreshKey((currentKey) => currentKey + 1);
                  }}
                  onVoteRecordedOnChain={(decision) => {
                    markCaseAsRecordedOnChain(selectedCase.id, decision);
                  }}
                />
              </div>
            ) : (
              <div className="flex h-full items-start">
                <div className="w-full rounded-3xl bg-[var(--surface-container-low)] p-6 text-sm text-[var(--on-surface-variant)]">
                Select a case to inspect its moderation details.
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
