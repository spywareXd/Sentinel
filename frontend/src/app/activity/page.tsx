"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ActivityDetailPanel from "@/components/activity/ActivityDetailPanel";
import ActivityHeader from "@/components/activity/ActivityHeader";
import ActivityList from "@/components/activity/ActivityList";
import ActivitySummaryStrip from "@/components/activity/ActivitySummaryStrip";
import Sidebar from "@/components/layout/Sidebar";
import {
  getExpiredActivePunishmentIds,
  getPunishmentExpiry,
  isActivePunishment,
} from "@/utils/punishment";
import type { ActivityRecord } from "@/types/activity";
import type { UserPunishment } from "@/types/database/userPunishment";
import { createClient } from "@/utils/supabase/client";

const normalizeWalletAddress = (value?: string | null) => value?.trim().toLowerCase() || "";

const formatPunishmentType = (value: string) =>
  value
    .replace(/[_-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const formatTimestamp = (value?: string | null) => {
  if (!value) return "Not available";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";

  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDuration = (punishment: UserPunishment) => {
  const issuedAt = punishment.issued_at ? new Date(punishment.issued_at) : null;
  const expiresAt = getPunishmentExpiry(punishment);

  if (issuedAt && expiresAt && !Number.isNaN(issuedAt.getTime())) {
    const diffSeconds = Math.max(
      0,
      Math.round((expiresAt.getTime() - issuedAt.getTime()) / 1000),
    );

    if (diffSeconds < 60) return `${diffSeconds} seconds`;

    const diffMinutes = Math.round(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"}`;

    const diffHours = Math.round(diffMinutes / 60);
    return `${diffHours} hour${diffHours === 1 ? "" : "s"}`;
  }

  if (punishment.duration) {
    return `${punishment.duration} minute${punishment.duration === 1 ? "" : "s"}`;
  }

  return "Duration unavailable";
};

const getIssuedTimestamp = (punishment: Pick<UserPunishment, "issued_at">) => {
  const issuedAt = new Date(punishment.issued_at).getTime();
  return Number.isNaN(issuedAt) ? 0 : issuedAt;
};

const sortPunishments = (rows: UserPunishment[] | null | undefined) =>
  [...(rows ?? [])].sort((left, right) => getIssuedTimestamp(right) - getIssuedTimestamp(left));

const applyInactiveState = (punishments: UserPunishment[] | null | undefined, punishmentIds: string[]) => {
  if (!punishmentIds.length) return [...(punishments ?? [])];

  const expiredSet = new Set(punishmentIds);
  return [...(punishments ?? [])].map((punishment) =>
    expiredSet.has(punishment.id)
      ? { ...punishment, is_active: false }
      : punishment,
  );
};

const mapActivityRecord = (punishment: UserPunishment): ActivityRecord => {
  const isActive = Boolean(punishment.is_active) && isActivePunishment(punishment);
  const typeLabel = formatPunishmentType(punishment.punishment_type);

  return {
    id: punishment.id,
    title: `${typeLabel} Record`,
    punishmentType: typeLabel,
    status: isActive ? "Active" : "Expired",
    issuedAt: formatTimestamp(punishment.issued_at),
    expiresAt: formatTimestamp(getPunishmentExpiry(punishment)?.toISOString()),
    durationLabel: formatDuration(punishment),
    reason: punishment.reason?.trim() || "No reason was attached to this punishment.",
    caseReference: punishment.case_id ? `Case ${punishment.case_id}` : "No linked case",
    issuerLabel: punishment.issued_by ? `Issuer ${punishment.issued_by.slice(0, 8)}` : "Automated moderation",
    walletAddress: punishment.wallet_address || "No wallet recorded",
    isActive,
  };
};

export default function ActivityPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [records, setRecords] = useState<ActivityRecord[]>([]);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadActivity = async () => {
      setIsLoading(true);
      const deactivateExpiredPunishments = async (punishments: UserPunishment[] | null | undefined) => {
        const expiredIds = getExpiredActivePunishmentIds(punishments);
        if (!expiredIds.length) return applyInactiveState(punishments, []);

        const { error } = await supabase
          .from("user_punishments")
          .update({ is_active: false })
          .in("id", expiredIds);

        if (error) {
          console.error("Error deactivating expired punishments in activity:", error);
        }

        return applyInactiveState(punishments, expiredIds);
      };

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

      const normalizedWallet = normalizeWalletAddress(profile?.wallet_address);

      const byUserResult = await supabase
        .from("user_punishments")
        .select("*")
        .eq("user_id", user.id)
        .order("issued_at", { ascending: false });

      if (!isMounted) return;

      if (byUserResult.error) {
        console.error("Error loading activity by user_id:", byUserResult.error);
      }

      let punishments = await deactivateExpiredPunishments(
        sortPunishments(byUserResult.data as UserPunishment[] | null),
      );

      if (!punishments.length && normalizedWallet) {
        const byWalletResult = await supabase
          .from("user_punishments")
          .select("*")
          .eq("wallet_address", normalizedWallet)
          .order("issued_at", { ascending: false });

        if (!isMounted) return;

        if (byWalletResult.error) {
          console.error("Error loading activity by wallet_address:", byWalletResult.error);
        } else {
          punishments = await deactivateExpiredPunishments(
            sortPunishments(byWalletResult.data as UserPunishment[] | null),
          );
        }
      }

      if (!punishments.length && byUserResult.error) {
        setRecords([]);
        setSelectedActivityId(null);
        setIsLoading(false);
        return;
      }

      const mappedRecords = punishments.map(mapActivityRecord);
      setRecords(mappedRecords);
      setSelectedActivityId((current) => current ?? mappedRecords[0]?.id ?? null);
      setIsLoading(false);
    };

    void loadActivity();

    return () => {
      isMounted = false;
    };
  }, [router, supabase]);

  useEffect(() => {
    let isCancelled = false;

    const attachRealtime = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || isCancelled) return;

      const channel = supabase
        .channel(`activity-punishments-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "user_punishments",
            filter: `user_id=eq.${user.id}`,
          },
          async () => {
            const { data, error } = await supabase
              .from("user_punishments")
              .select("*")
              .eq("user_id", user.id)
              .order("issued_at", { ascending: false });

            if (error || isCancelled) return;
            const punishments = sortPunishments((data ?? []) as UserPunishment[]);
            const expiredIds = getExpiredActivePunishmentIds(punishments);

            if (expiredIds.length) {
              const { error: deactivateError } = await supabase
                .from("user_punishments")
                .update({ is_active: false })
                .in("id", expiredIds);

              if (deactivateError) {
                console.error("Error deactivating expired punishments in activity realtime:", deactivateError);
              }
            }

            const mappedRecords = applyInactiveState(punishments, expiredIds)
              .map(mapActivityRecord);
            setRecords(mappedRecords);
          },
        )
        .subscribe();

      return () => {
        void supabase.removeChannel(channel);
      };
    };

    let cleanup: (() => void) | undefined;

    void attachRealtime().then((handler) => {
      cleanup = handler;
    });

    return () => {
      isCancelled = true;
      cleanup?.();
    };
  }, [supabase]);

  const selectedRecord =
    (selectedActivityId
      ? records.find((record) => record.id === selectedActivityId)
      : null) ??
    records[0] ??
    null;

  const summary = useMemo(
    () => ({
      total: records.length,
      active: records.filter((record) => record.isActive).length,
      bans: records.filter((record) => record.punishmentType.toLowerCase() === "ban").length,
      timeouts: records.filter((record) => record.punishmentType.toLowerCase() === "timeout").length,
    }),
    [records],
  );

  return (
    <main className="flex min-h-screen bg-[var(--background)] text-[var(--on-surface)]">
      <Sidebar />

      <section className="flex min-h-screen min-w-0 flex-1 flex-col">
        <ActivityHeader />

        <div className="flex-1 overflow-hidden px-8 py-8">
          <div className="grid h-full min-h-0 gap-6 xl:grid-cols-[minmax(0,1.2fr)_420px]">
            <section className="premium-scrollbar flex min-h-0 flex-col gap-6 overflow-y-auto pr-2">
              <ActivitySummaryStrip
                total={summary.total}
                active={summary.active}
                bans={summary.bans}
                timeouts={summary.timeouts}
              />

              {isLoading ? (
                <div className="rounded-3xl bg-[var(--surface-container-low)] p-6 text-sm text-[var(--on-surface-variant)]">
                  Loading activity...
                </div>
              ) : records.length ? (
                <ActivityList
                  records={records}
                  selectedActivityId={selectedRecord?.id ?? ""}
                  onSelectActivity={setSelectedActivityId}
                />
              ) : (
                <div className="rounded-3xl bg-[var(--surface-container-low)] p-6 text-sm text-[var(--on-surface-variant)]">
                  No punishment history yet.
                </div>
              )}
            </section>

            <div className="min-h-0">
              {selectedRecord ? (
                <ActivityDetailPanel record={selectedRecord} />
              ) : (
                <aside className="flex h-full items-center justify-center rounded-[1.75rem] border border-[color:color-mix(in_srgb,var(--outline-variant)_25%,transparent)] bg-[color:color-mix(in_srgb,var(--surface-container-highest)_45%,transparent)] p-8 text-center text-sm text-[var(--on-surface-variant)] backdrop-blur-xl">
                  Select an activity record to inspect its details.
                </aside>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
