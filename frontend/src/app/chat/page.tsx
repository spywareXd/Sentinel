"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ChatFeed from "@/components/chat/ChatFeed";
import Composer from "@/components/chat/Composer";
import PunishmentPopout from "@/components/chat/PunishmentPopout";
import RightRail from "@/components/layout/RightRail";
import SecurityHandshakeLoader from "@/components/layout/SecurityHandshakeLoader";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import {
  getExpiredActivePunishmentIds,
  getPunishmentExpiry,
  isActivePunishment,
  splitPunishmentReason,
} from "@/utils/punishment";
import { roomDetails } from "@/mockdata/room";
import type { UserPunishment } from "@/types/database/userPunishment";
import type { Message } from "@/types/mockdata/chat";
import type { RoomMember } from "@/types/mockdata/room";
import { createClient } from "@/utils/supabase/client";

const normalizeWalletAddress = (value?: string | null) => value?.trim().toLowerCase() || "";

const findLatestPunishment = (rows: UserPunishment[] | null | undefined) =>
  [...(rows ?? [])]
    .sort((left, right) => {
      const leftTime = new Date(left.issued_at).getTime();
      const rightTime = new Date(right.issued_at).getTime();
      return (Number.isNaN(rightTime) ? 0 : rightTime) - (Number.isNaN(leftTime) ? 0 : leftTime);
    })[0] ?? null;

const mergePunishmentRows = (
  ...groups: Array<UserPunishment[] | null | undefined>
): UserPunishment[] => {
  const byId = new Map<string, UserPunishment>();

  for (const punishment of groups.flatMap((group) => group ?? [])) {
    if (!punishment?.id) continue;
    byId.set(punishment.id, punishment);
  }

  return [...byId.values()].sort((left, right) => {
    const leftTime = new Date(left.issued_at).getTime();
    const rightTime = new Date(right.issued_at).getTime();
    return (Number.isNaN(rightTime) ? 0 : rightTime) - (Number.isNaN(leftTime) ? 0 : leftTime);
  });
};

const applyInactiveState = (
  punishments: UserPunishment[] | null | undefined,
  punishmentIds: string[],
) => {
  if (!punishmentIds.length) return [...(punishments ?? [])];

  const expiredIds = new Set(punishmentIds);
  return [...(punishments ?? [])].map((punishment) =>
    expiredIds.has(punishment.id)
      ? { ...punishment, is_active: false }
      : punishment,
  );
};

const BLOCKING_PUNISHMENT_TYPES = new Set([
  "timeout",
  "mute",
  "ban",
  "restricted",
  "suspension",
  "kick",
]);

const formatPunishmentLabel = (punishmentType?: string | null) => {
  const normalized = punishmentType?.trim();
  if (!normalized) return "Punishment Active";

  return `${normalized
    .replace(/[_-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")} Active`;
};

function ChatPageContent() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const searchParams = useSearchParams();

  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState<string>("You");
  const [walletAddress, setWalletAddress] = useState<string>("");
  const [participants, setParticipants] = useState<RoomMember[]>([]);
  const [activePunishment, setActivePunishment] = useState<UserPunishment | null>(null);
  const [acknowledgedPunishmentId, setAcknowledgedPunishmentId] = useState<string | null>(null);
  const [countdownNowMs, setCountdownNowMs] = useState<number>(() => Date.now());
  const [hasLoadedMessages, setHasLoadedMessages] = useState(false);
  const focusMessageId = searchParams.get("focus");

  const hasActivePunishment =
    activePunishment !== null && isActivePunishment(activePunishment);
  const punishmentBanner = hasActivePunishment && activePunishment
    ? `${activePunishment.punishment_type.replace(/[_-]+/g, " ")}${
        activePunishment.reason ? ` - ${activePunishment.reason}` : ""
      }`
    : null;
  const blocksMessaging =
    hasActivePunishment &&
    activePunishment !== null &&
    BLOCKING_PUNISHMENT_TYPES.has(activePunishment.punishment_type.toLowerCase());
  const shouldShowPunishmentPopout =
    hasActivePunishment &&
    activePunishment !== null &&
    acknowledgedPunishmentId !== activePunishment.id;
  const timeoutReason =
    hasActivePunishment && activePunishment
      ? splitPunishmentReason(activePunishment.reason).display
      : "No reason was provided.";
  const punishmentStatusLabel =
    hasActivePunishment && activePunishment
      ? formatPunishmentLabel(activePunishment.punishment_type)
      : "Punishment Active";
  const timeoutCountdown = useMemo(() => {
    if (!activePunishment || !hasActivePunishment) return null;

    const expiresAt = getPunishmentExpiry(activePunishment);
    if (!expiresAt) return null;

    const remainingMs = expiresAt.getTime() - countdownNowMs;
    if (remainingMs <= 0) return "00:00";

    const totalSeconds = Math.floor(remainingMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const hh = String(hours).padStart(2, "0");
    const mm = String(minutes).padStart(2, "0");
    const ss = String(seconds).padStart(2, "0");

    return hours > 0 ? `${hh}:${mm}:${ss}` : `${mm}:${ss}`;
  }, [activePunishment, countdownNowMs, hasActivePunishment]);
  const isFocusedMessageMissing =
    Boolean(focusMessageId) &&
    hasLoadedMessages &&
    !messages.some((message) => message.id === focusMessageId);

  const fetchActivePunishment = useCallback(async (
    currentUserId: string,
    currentWalletAddress?: string | null,
  ): Promise<UserPunishment | null> => {
    const normalizedWallet = normalizeWalletAddress(currentWalletAddress);
    const deactivatePunishments = async (punishments: UserPunishment[] | null | undefined) => {
      const expiredIds = getExpiredActivePunishmentIds(punishments);
      if (!expiredIds.length) return applyInactiveState(punishments, []);

      const { error } = await supabase
        .from("user_punishments")
        .update({ is_active: false })
        .in("id", expiredIds);

      if (error) {
        console.error("Error deactivating expired punishments:", error);
      }
      return applyInactiveState(punishments, expiredIds);
    };

    const byUserResult = await supabase
      .from("user_punishments")
      .select("*")
      .eq("user_id", currentUserId)
      .order("issued_at", { ascending: false });

    if (byUserResult.error) {
      console.error("Error loading punishments by user_id:", byUserResult.error);
    }

    const byUserRows = (byUserResult.data as UserPunishment[] | null) ?? [];
    let byWalletRows: UserPunishment[] = [];

    if (normalizedWallet) {
      const byWalletResult = await supabase
        .from("user_punishments")
        .select("*")
        .eq("wallet_address", normalizedWallet)
        .order("issued_at", { ascending: false });

      if (byWalletResult.error) {
        console.error("Error loading punishments by wallet_address:", byWalletResult.error);
      } else {
        byWalletRows = (byWalletResult.data as UserPunishment[] | null) ?? [];
      }
    }

    const combinedRows = mergePunishmentRows(byUserRows, byWalletRows);
    const normalizedRows = await deactivatePunishments(combinedRows);
    const latestPunishment = findLatestPunishment(normalizedRows);

    if (!latestPunishment) {
      return null;
    }

    return isActivePunishment(latestPunishment) ? latestPunishment : null;
  }, [supabase]);

  useEffect(() => {
    const getUser = async () => {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (error || !user) {
          router.push("/login");
          return;
        }

        setUserId(user.id);

        const { data: profile } = await supabase
          .from("profiles")
          .select("username, wallet_address")
          .eq("id", user.id)
          .single();

        if (profile) {
          setUsername(profile.username || user.email || "You");
          setWalletAddress(profile.wallet_address || "");
        }

        const punishment = await fetchActivePunishment(user.id, profile?.wallet_address);
        setActivePunishment(punishment);

        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, username")
          .order("username", { ascending: true });

        if (profiles) {
          setParticipants(
            profiles.map((profileItem: { id: string; username: string | null }) => {
              const displayName = profileItem.username || "Unknown";

              return {
                name: displayName,
                initials: displayName.slice(0, 1).toUpperCase(),
                role: profileItem.id === user.id ? "Online" : "Participant",
                status: profileItem.id === user.id ? "online" : "offline",
              };
            }),
          );
        }
      } finally {
        setIsBootstrapping(false);
      }
    };

    void getUser();
  }, [fetchActivePunishment, router, supabase]);

  useEffect(() => {
    if (!userId) return;

    let isMounted = true;

    const refreshActivePunishment = async () => {
      if (!isMounted) return;
      const punishment = await fetchActivePunishment(userId, walletAddress);
      if (!isMounted) return;
      setActivePunishment(punishment);
    };

    const channel = supabase
      .channel(`chat-punishments-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_punishments" },
        () => {
          void refreshActivePunishment();
        },
      )
      .subscribe();

    const interval = window.setInterval(() => {
      void refreshActivePunishment();
    }, 5000);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [fetchActivePunishment, supabase, userId, walletAddress]);

  useEffect(() => {
    if (!activePunishment || !hasActivePunishment) return;

    const expiresAt = getPunishmentExpiry(activePunishment);
    if (!expiresAt) return;

    const timeout = window.setTimeout(() => {
      void supabase
        .from("user_punishments")
        .update({ is_active: false })
        .eq("id", activePunishment.id)
        .then(({ error }) => {
          if (error) {
            console.error("Error marking punishment inactive after expiry:", error);
          }
        });
      setActivePunishment(null);
    }, Math.max(0, expiresAt.getTime() - Date.now()) + 250);

    return () => window.clearTimeout(timeout);
  }, [activePunishment, hasActivePunishment, supabase]);

  useEffect(() => {
    if (!activePunishment || !hasActivePunishment) return;

    const expiresAt = getPunishmentExpiry(activePunishment);
    if (!expiresAt) return;

    const interval = window.setInterval(() => {
      setCountdownNowMs(Date.now());
    }, 1000);

    return () => window.clearInterval(interval);
  }, [activePunishment, hasActivePunishment]);

  useEffect(() => {
    if (!userId) return;

    const fetchMessages = async () => {
      const { data: messagesData, error: messagesError } = await supabase
        .from("messages")
        .select("*")
        .order("created_at", { ascending: true });

      if (messagesError) {
        console.error("Error fetching messages:", messagesError);
        setHasLoadedMessages(true);
        return;
      }

      if (messagesData && messagesData.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, username");
        const profileMap = new Map(
          profilesData?.map((p: { id: string; username: string | null }) => [p.id, p.username]) || [],
        );

        const formatted: Message[] = messagesData.map((msg: {
          id: string | number;
          user_id: string;
          created_at: string;
          content: string;
          flagged?: boolean | null;
        }) => {
          const msgUsername = profileMap.get(msg.user_id) || "Unknown User";
          return {
            id: String(msg.id),
            author: msgUsername,
            authorInitials: msgUsername.substring(0, 1).toUpperCase(),
            time: new Date(msg.created_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
            text: msg.content,
            flagged: Boolean(msg.flagged),
            tone: msg.user_id === userId ? "self" : "primary",
          };
        });
        setMessages(formatted);
      }

      setHasLoadedMessages(true);
    };

    void fetchMessages();

    const subscription = supabase
      .channel("messages_changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        async (payload: {
          new: {
            id: string | number;
            user_id: string;
            created_at: string;
            content: string;
            flagged?: boolean | null;
          };
        }) => {
          const newMsg = payload.new;

          setMessages((current) => {
            if (current.some((message) => message.id === String(newMsg.id))) return current;
            return current;
          });

          const { data: profileData } = await supabase
            .from("profiles")
            .select("username")
            .eq("id", newMsg.user_id)
            .single();

          const formattedNew: Message = {
            id: String(newMsg.id),
            author: profileData?.username || "Unknown",
            authorInitials: (profileData?.username || "U")
              .substring(0, 1)
              .toUpperCase(),
            time: new Date(newMsg.created_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
            text: newMsg.content,
            flagged: Boolean(newMsg.flagged),
            tone: newMsg.user_id === userId ? "self" : "primary",
          };

          setMessages((prev) => {
            if (prev.some((message) => message.id === formattedNew.id)) return prev;
            return [...prev, formattedNew];
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages" },
        (payload: { new: { id: string | number; flagged?: boolean | null } }) => {
          setMessages((prev) =>
            prev.map((message) =>
              message.id === String(payload.new.id)
                ? { ...message, flagged: Boolean(payload.new.flagged) }
                : message,
            ),
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [supabase, userId]);

  const filteredMessages = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (!normalizedQuery) return messages;
    return messages.filter((message) => {
      const searchableText = `${message.author} ${message.text}`.toLowerCase();
      return searchableText.includes(normalizedQuery);
    });
  }, [messages, searchQuery]);

  const handleSend = async (text: string) => {
    const trimmedText = text.trim();
    if (!trimmedText || !userId || blocksMessaging) return;

    const { data: insertedMsg, error } = await supabase
      .from("messages")
      .insert({
        content: trimmedText,
        user_id: userId,
        wallet_address: walletAddress,
      })
      .select()
      .single();

    if (error) {
      console.error("Error sending message:", error);
      return;
    }

    if (insertedMsg) {
      const formattedOptimistic: Message = {
        id: insertedMsg.id,
        author: username,
        authorInitials: username.substring(0, 1).toUpperCase(),
        time: new Date(insertedMsg.created_at).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        text: insertedMsg.content,
        tone: "self",
      };
      setMessages((prev) => {
        if (prev.some((message) => message.id === formattedOptimistic.id)) return prev;
        return [...prev, formattedOptimistic];
      });
    }
  };

  const handleDelete = async (messageId: string) => {
    const { error } = await supabase
      .from("messages")
      .delete()
      .eq("id", messageId);
    if (!error) {
      setMessages((prev) => prev.filter((message) => message.id !== messageId));
    }
  };

  if (isBootstrapping) {
    return <SecurityHandshakeLoader />;
  }

  return (
    <div
      className={[
        "flex h-screen overflow-hidden",
        blocksMessaging
          ? "bg-[radial-gradient(circle_at_top,rgba(185,28,28,0.12),transparent_35%),var(--background)]"
          : "bg-[var(--background)]",
      ].join(" ")}
    >
      {shouldShowPunishmentPopout && activePunishment && (
        <PunishmentPopout
          punishment={activePunishment}
          onAcknowledge={() => setAcknowledgedPunishmentId(activePunishment.id)}
        />
      )}

      <Sidebar />

      <main className="flex min-w-0 min-h-0 flex-1 flex-col">
        <Topbar searchQuery={searchQuery} onSearchChange={setSearchQuery} />

        <div className="flex min-h-0 flex-1 overflow-hidden">
          <div className="flex min-w-0 min-h-0 flex-1 flex-col">
            {punishmentBanner && (
              <div className="relative mx-6 mt-4 rounded-2xl border border-[rgba(255,124,124,0.42)] bg-[rgba(255,82,82,0.05)] pl-5 py-3 pr-28 text-sm text-[#ffcdc7] shadow-[0_10px_24px_rgba(255,72,72,0.12)] backdrop-blur-lg backdrop-saturate-200 backdrop-brightness-125">
                <span className="font-bold uppercase tracking-[0.18em] text-[12px] text-[#ffb4ab]">
                  {punishmentStatusLabel}
                </span>
                <p className="mt-1 leading-6">{timeoutReason}</p>
                {timeoutCountdown && (
                  <p className="absolute right-4 top-1/2 -translate-y-1/2 text-base font-semibold tracking-[0.08em] text-[#ffb4ab]">
                    {timeoutCountdown}
                  </p>
                )}
              </div>
            )}
            {isFocusedMessageMissing && (
              <div className="mx-6 mt-4 rounded-2xl border border-[color:color-mix(in_srgb,var(--tertiary)_24%,transparent)] bg-[color:color-mix(in_srgb,var(--tertiary)_10%,transparent)] px-5 py-3 text-sm text-[var(--on-surface)]">
                The flagged message is no longer available in the current feed.
              </div>
            )}
            <ChatFeed
              messages={filteredMessages}
              onDelete={handleDelete}
              searchQuery={searchQuery}
              focusMessageId={focusMessageId}
            />
            <Composer
              onSend={handleSend}
              disabled={blocksMessaging}
              disabledReason={blocksMessaging ? timeoutReason : null}
            />
          </div>
          <RightRail roomDetails={roomDetails} roomMembers={participants} />
        </div>
      </main>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-[var(--background)] text-sm text-[var(--on-surface-variant)]">
          Loading chat...
        </div>
      }
    >
      <ChatPageContent />
    </Suspense>
  );
}
