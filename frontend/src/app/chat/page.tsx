"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ChatFeed from "@/components/chat/ChatFeed";
import Composer from "@/components/chat/Composer";
import RightRail from "@/components/layout/RightRail";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import { roomDetails } from "@/mockdata/room";
import { Shield } from "lucide-react";
import type { Message } from "@/types/mockdata/chat";
import type { RoomMember } from "@/types/mockdata/room";
import { createClient } from "@/utils/supabase/client";

export default function Home() {
  const supabase = createClient();
  const router = useRouter();

  const [messages, setMessages] = useState<Message[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // The logged-in user's info, fetched from Supabase auth + profiles
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState<string>("You");
  const [walletAddress, setWalletAddress] = useState<string>("");
  const [participants, setParticipants] = useState<RoomMember[]>([]);
  const [loading, setLoading] = useState(true);

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

      setLoading(false);
    };

    getUser();
  }, [router, supabase]);

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

        const formatted: Message[] = messagesData.map((msg: { id: string | number; user_id: string; created_at: string; content: string }) => {
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
        async (payload: { new: { id: string | number; user_id: string; created_at: string; content: string } }) => {
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
            tone: newMsg.user_id === userId ? "self" : "primary",
          };

          setMessages((prev) => {
            if (prev.some((m) => m.id === formattedNew.id)) return prev;
            return [...prev, formattedNew];
          });
        }
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
    if (!trimmedText || !userId) return;

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

  if (loading) {
    return (
      <div className="h-screen bg-[#05070a] flex flex-col items-center justify-center relative overflow-hidden">
        {/* Background Aura */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="relative group perspective">
          <div className="p-1.5 rounded-[2.5rem] bg-white/[0.03] border border-white/[0.05] shadow-2xl relative">
            <div className="bg-[#a3a5fa] text-[#0a0c14] p-6 rounded-[2.1rem] shadow-[0_0_50px_rgba(163,165,250,0.3)] animate-pulse">
              <Shield className="w-16 h-16" strokeWidth={2.5} />
            </div>
            {/* Spinning Orbitings */}
            <div className="absolute inset-[-40px] border border-primary/20 rounded-full scale-110 animate-spin-slow pointer-events-none" />
            <div className="absolute inset-[-80px] border border-secondary/10 rounded-full scale-125 animate-reverse-spin-slow opacity-30 pointer-events-none" />
          </div>
        </div>

        <div className="mt-16 flex flex-col items-center gap-3">
          <p className="text-on-surface font-headline font-bold tracking-[0.4em] text-xs uppercase text-center ml-1">
            Establishing Security Handshake
          </p>
          <div className="flex gap-1.5 items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" />
          </div>
        </div>

        <div className="mt-8 text-[11px] font-bold tracking-widest text-on-surface-variant/40 uppercase">
          Sentitnel Defense Protocol Active
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--background)]">
      <Sidebar />

      <main className="flex min-w-0 min-h-0 flex-1 flex-col">
        <Topbar searchQuery={searchQuery} onSearchChange={setSearchQuery} />

        <div className="flex min-h-0 flex-1 overflow-hidden">
          <div className="flex min-w-0 min-h-0 flex-1 flex-col">
            <ChatFeed
              messages={filteredMessages}
              onDelete={handleDelete}
              searchQuery={searchQuery}
            />
            <Composer onSend={handleSend} />
          </div>
          <RightRail roomDetails={roomDetails} roomMembers={participants} />
        </div>
      </main>
    </div>
  );
}
