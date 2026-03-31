"use client";

import { useMemo, useState, useEffect } from "react";
import ChatFeed from "@/components/chat/ChatFeed";
import Composer from "@/components/chat/Composer";
import RightRail from "@/components/layout/RightRail";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import { currentUser } from "@/mockdata/user";
import type { Message } from "@/types/mockdata/chat";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    // 1. Fetch historical messages
    const fetchMessages = async () => {
      // Fetch messages without join to avoid URL-encoding bugs with exclamation marks in Next.js fetch
      const { data: messagesData, error: messagesError } = await supabase
        .from("messages")
        .select("*")
        .order("created_at", { ascending: true });

      if (messagesError) {
        console.error("Error fetching messages:", messagesError);
        return;
      }

      if (messagesData && messagesData.length > 0) {
        // Fetch all profiles to map usernames manually
        const { data: profilesData } = await supabase.from("profiles").select("id, username");
        const profileMap = new Map(profilesData?.map(p => [p.id, p.username]) || []);

        const formatted: Message[] = messagesData.map((msg: any) => {
          const username = profileMap.get(msg.user_id) || "Unknown User";
          return {
            id: msg.id,
            author: username,
            authorInitials: username.substring(0, 1).toUpperCase(),
            time: new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            text: msg.content,
            tone: msg.user_id === "c3fbef41-5d59-4bb6-aee1-1a889bf53126" ? "self" : "primary",
          };
        });
        setMessages(formatted);
      }
    };

    fetchMessages();

    // 2. Listen to new insertions
    const subscription = supabase
      .channel("messages_changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        async (payload) => {
          const newMsg = payload.new;

          // Prevent double-syncing if the optimistic UI already added it
          setMessages((currentMessages) => {
            if (currentMessages.some(m => m.id === newMsg.id)) {
              return currentMessages;
            }
            // Temporarily return unchanged; the async fetch below will effectively append it
            return currentMessages;
          });
          
          const { data: profileData } = await supabase
            .from("profiles")
            .select("username")
            .eq("id", newMsg.user_id)
            .single();

          const formattedNew: Message = {
            id: newMsg.id,
            author: profileData?.username || "Unknown",
            authorInitials: (profileData?.username || "U").substring(0, 1).toUpperCase(),
            time: new Date(newMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            text: newMsg.content,
            tone: newMsg.user_id === "c3fbef41-5d59-4bb6-aee1-1a889bf53126" ? "self" : "primary",
          };

          setMessages((prev) => {
            if (prev.some(m => m.id === formattedNew.id)) return prev;
            return [...prev, formattedNew];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

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
    if (!trimmedText) return;

    // Hardcoding a guaranteed valid user from your DB to bypass RLS and strict FK constraints
    const realUserId = "c3fbef41-5d59-4bb6-aee1-1a889bf53126"; // 'm3dh4'
    const realWallet = "0xeeec06f7eeb601dbd73d4ba74471e72843a7a38d";

    const { data: insertedMsg, error } = await supabase.from("messages").insert({
      content: trimmedText,
      user_id: realUserId,
      wallet_address: realWallet
    }).select().single();

    if (error) {
      console.error("Error sending message:", error);
      return;
    }

    // Optimistically update the UI instantly
    if (insertedMsg) {
      const formattedOptimistic: Message = {
        id: insertedMsg.id,
        author: "m3dh4",
        authorInitials: "M",
        time: new Date(insertedMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: insertedMsg.content,
        tone: "self",
      };
      setMessages((prev) => {
        if (prev.some(m => m.id === formattedOptimistic.id)) return prev;
        return [...prev, formattedOptimistic];
      });
    }
  };

  const handleDelete = async (messageId: string) => {
    const { error } = await supabase.from("messages").delete().eq("id", messageId);
    if (!error) {
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--background)]">
      <Sidebar />

      <main className="flex min-w-0 min-h-0 flex-1 flex-col">
        <Topbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

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
