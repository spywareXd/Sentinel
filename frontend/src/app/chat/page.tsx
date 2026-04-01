"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ChatFeed from "@/components/chat/ChatFeed";
import Composer from "@/components/chat/Composer";
import RightRail from "@/components/layout/RightRail";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import type { Message } from "@/types/mockdata/chat";
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
    };

    getUser();
  }, []);

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
          profilesData?.map((p: any) => [p.id, p.username]) || []
        );

        const formatted: Message[] = messagesData.map((msg: any) => {
          const msgUsername = profileMap.get(msg.user_id) || "Unknown User";
          return {
            id: msg.id,
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
        async (payload: any) => {
          const newMsg = payload.new;

          // Skip if we already have this message (from optimistic update)
          setMessages((current) => {
            if (current.some((m) => m.id === newMsg.id)) return current;
            return current;
          });

          const { data: profileData } = await supabase
            .from("profiles")
            .select("username")
            .eq("id", newMsg.user_id)
            .single();

          const formattedNew: Message = {
            id: newMsg.id,
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
  }, [userId]);

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
          <RightRail />
        </div>
      </main>
    </div>
  );
}
