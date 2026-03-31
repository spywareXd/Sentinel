"use client";

import { useMemo, useState } from "react";
import ChatFeed from "@/components/chat/ChatFeed";
import Composer from "@/components/chat/Composer";
import RightRail from "@/components/layout/RightRail";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import { messages as initialMessages } from "@/mockdata/chat";
import { currentUser } from "@/mockdata/user";
import type { Message } from "@/types/mockdata/chat";

export default function Home() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredMessages = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    if (!normalizedQuery) return messages;

    return messages.filter((message) => {
      const searchableText = `${message.author} ${message.text}`.toLowerCase();
      return searchableText.includes(normalizedQuery);
    });
  }, [messages, searchQuery]);

  const handleSend = (text: string) => {
    const trimmedText = text.trim();

    if (!trimmedText) return;

    setMessages((prevMessages) => [
      ...prevMessages,
      {
        id: prevMessages.length + 1,
        author: currentUser.name,
        authorInitials: currentUser.initials,
        authorLogoUrl: currentUser.logoUrl,
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        text: trimmedText,
        tone: "self",
      },
    ]);
  };

  const handleDelete = (messageId: number) => {
    setMessages((prevMessages) =>
      prevMessages.filter((message) => message.id !== messageId),
    );
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
