"use client";

import { useEffect, useRef, useState } from "react";
import MessageRow from "@/components/chat/feed/MessageRow";
import { feedMeta } from "@/mockdata/chat";
import type { Message } from "@/types/mockdata/chat";

type ChatFeedProps = {
  messages: Message[];
  onDelete: (messageId: string) => void;
  searchQuery: string;
};

export default function ChatFeed({
  messages,
  onDelete,
  searchQuery,
}: ChatFeedProps) {
  const feedRef = useRef<HTMLElement | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Syncing state during render is the recommended pattern to avoid cascading useEffect renders
  const [prevMessages, setPrevMessages] = useState(messages);
  if (messages !== prevMessages) {
    setPrevMessages(messages);
    if (openMenuId !== null) {
      setOpenMenuId(null);
    }
  }

  // Scroll to bottom when messages change
  useEffect(() => {
    const feed = feedRef.current;
    if (feed) {
      feed.scrollTo({
        top: feed.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;

      if (!event.target.closest('[data-message-menu-root="true"]')) {
        if (openMenuId !== null) setOpenMenuId(null);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (openMenuId !== null) setOpenMenuId(null);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [openMenuId]); // Added openMenuId as dependency to use latest value safely

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setOpenMenuId(null);
  };

  return (
    <section
      ref={feedRef}
      className="premium-scrollbar flex min-w-0 min-h-0 flex-1 flex-col overflow-y-auto px-6 py-6"
    >
      <div className="flex flex-col">
        <div className="mb-6 flex justify-center py-4">
          <span className="rounded-full bg-[var(--surface-container-highest)] px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--on-surface-variant)] shadow-sm">
            {searchQuery.trim()
              ? `${messages.length} result${messages.length === 1 ? "" : "s"}`
              : feedMeta.dayLabel}
          </span>
        </div>

        {messages.length === 0 ? (
          <div className="rounded-[1.25rem] bg-[var(--surface-container-low)] px-5 py-6 text-sm text-[var(--on-surface-variant)]">
            No messages matched &quot;{searchQuery.trim()}&quot;.
          </div>
        ) : (
          <div className="flex flex-col">
            {messages.map((message, index) => {
              const prevMessage = messages[index - 1];
              const isGrouped = !!prevMessage && prevMessage.author === message.author;
              const msgWithGrouped = { ...message, grouped: isGrouped };
              
              return (
                <div key={message.id} className={index === 0 ? "" : (isGrouped ? "mt-1" : "mt-4")}>
                  <MessageRow
                    message={msgWithGrouped}
                    shouldOpenUp={index >= messages.length - 3}
                    isMenuOpen={openMenuId === message.id}
                    onToggleMenu={() =>
                      setOpenMenuId((currentId) =>
                        currentId === message.id ? null : message.id,
                      )
                    }
                    onCopy={(text) => void handleCopy(text)}
                    onDelete={(messageId) => {
                      onDelete(messageId);
                      setOpenMenuId(null);
                    }}
                    onCloseMenu={() => setOpenMenuId(null)}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
