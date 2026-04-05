"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ChatFeed from "@/components/chat/ChatFeed";
import Composer from "@/components/chat/Composer";
import PunishmentPopout from "@/components/chat/PunishmentPopout";
import RightRail from "@/components/layout/RightRail";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import { getPunishmentExpiry, isActivePunishment } from "@/utils/punishment";
import { roomDetails } from "@/mockdata/room";
import type { UserPunishment } from "@/types/database/userPunishment";
import type { Message } from "@/types/mockdata/chat";
import type { RoomMember } from "@/types/mockdata/room";
import { createClient } from "@/utils/supabase/client";

export default function Home() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [messages, setMessages] = useState<Message[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // The logged-in user's info, fetched from Supabase auth + profiles
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState<string>("You");
  const [walletAddress, setWalletAddress] = useState<string>("");
  const [participants, setParticipants] = useState<RoomMember[]>([]);
  const [activePunishment, setActivePunishment] = useState<UserPunishment | null>(null);
  const [acknowledgedPunishmentId, setAcknowledgedPunishmentId] = useState<string | null>(null);
  const [countdownNowMs, setCountdownNowMs] = useState<number>(() => Date.now());

  const punishmentBanner = activePunishment
    ? `${activePunishment.punishment_type.replace(/[_-]+/g, " ")}${
        activePunishment.reason ? ` • ${activePunishment.reason}` : ""
      }`
    : null;
  const blocksMessaging =
    activePunishment !== null &&
    ["timeout", "mute", "ban", "restricted", "suspension", "kick"].includes(
      activePunishment.punishment_type.toLowerCase(),
    );
  const shouldShowPunishmentPopout =
    activePunishment !== null && acknowledgedPunishmentId !== activePunishment.id;
  const timeoutReason = activePunishment?.reason?.trim() || "No reason was provided.";
  const timeoutCountdown = useMemo(() => {
    if (!activePunishment) return null;

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
  }, [activePunishment, countdownNowMs]);

  // 1. Get the logged-in user's session and profile on mount
  useEffect(() => {
    const getUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error || !user) {
        // Not logged in — redirect to login
        router.push("/login");
        return;
      }

      setUserId(user.id);

      // Fetch their profile (username + wallet_address)
      const { data: profile } = await supabase
        .from("profiles")
        .select("username, wallet_address")
        .eq("id", user.id)
        .single();

      if (profile) {
        setUsername(profile.username || user.email || "You");
        setWalletAddress(profile.wallet_address || "");
      }

      const { data: punishment } = await supabase
        .from("user_punishments")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("issued_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (punishment) {
        const typedPunishment = punishment as UserPunishment;
        setActivePunishment(isActivePunishment(typedPunishment) ? typedPunishment : null);
      } else {
        setActivePunishment(null);
      }

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
    };

    getUser();
  }, [router, supabase]);

  useEffect(() => {
    if (!userId) return;

    let isMounted = true;

    const refreshActivePunishment = async () => {
      const { data: punishment } = await supabase
        .from("user_punishments")
        .select("*")
        .eq("user_id", userId)
        .eq("is_active", true)
        .order("issued_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!isMounted) return;

      if (!punishment) {
        setActivePunishment(null);
        return;
      }

      const typedPunishment = punishment as UserPunishment;
      setActivePunishment(isActivePunishment(typedPunishment) ? typedPunishment : null);
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
  }, [supabase, userId]);

  useEffect(() => {
    if (!activePunishment) return;

    const expiresAt = getPunishmentExpiry(activePunishment);
    if (!expiresAt) return;

    const timeout = window.setTimeout(() => {
      setActivePunishment(null);
    }, Math.max(0, expiresAt.getTime() - Date.now()) + 250);

    return () => window.clearTimeout(timeout);
  }, [activePunishment]);

  useEffect(() => {
    if (!activePunishment) return;

    const expiresAt = getPunishmentExpiry(activePunishment);
    if (!expiresAt) return;

    const interval = window.setInterval(() => {
      setCountdownNowMs(Date.now());
    }, 1000);

    return () => window.clearInterval(interval);
  }, [activePunishment]);

  // 2. Fetch historical messages + listen for realtime inserts
  useEffect(() => {
    if (!userId) return; // Wait until we know who the user is

    const fetchMessages = async () => {
      const { data: messagesData, error: messagesError } = await supabase
        .from("messages")
        .select("*")
        .order("created_at", { ascending: true });

      if (messagesError) {
        console.error("Error fetching messages:", messagesError);
        return;
      }

      if (messagesData && messagesData.length > 0) {
        // Fetch all profiles to map usernames
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, username");
        const profileMap = new Map(
          profilesData?.map((p: { id: string; username: string | null }) => [p.id, p.username]) || []
        );

        const formatted: Message[] = messagesData.map((msg: { id: string | number; user_id: string; created_at: string; content: string; flagged?: boolean | null }) => {
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
    };

    fetchMessages();

    // Realtime subscription for new messages
    const subscription = supabase
      .channel("messages_changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        async (payload: { new: { id: string | number; user_id: string; created_at: string; content: string; flagged?: boolean | null } }) => {
          const newMsg = payload.new;

          // Skip if we already have this message (from optimistic update)
          setMessages((current) => {
            if (current.some((m) => m.id === String(newMsg.id))) return current;
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
            if (prev.some((m) => m.id === formattedNew.id)) return prev;
            return [...prev, formattedNew];
          });
        }
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

    // Optimistically update the UI
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
        if (prev.some((m) => m.id === formattedOptimistic.id)) return prev;
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
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    }
  };

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
                  Timeout Active
                </span>
                <p className="mt-1 leading-6">{timeoutReason}</p>
                {timeoutCountdown && (
                  <p className="absolute right-4 top-1/2 -translate-y-1/2 text-base font-semibold tracking-[0.08em] text-[#ffb4ab]">
                    {timeoutCountdown}
                  </p>
                )}
              </div>
            )}
            <ChatFeed
              messages={filteredMessages}
              onDelete={handleDelete}
              searchQuery={searchQuery}
            />
            <Composer
              onSend={handleSend}
              disabled={blocksMessaging}
              disabledReason={
                blocksMessaging
                  ? timeoutReason
                  : null
              }
            />
          </div>
          <RightRail roomDetails={roomDetails} roomMembers={participants} />
        </div>
      </main>
    </div>
  );
}
