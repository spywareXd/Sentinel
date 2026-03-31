"use client";

import { useEffect, useRef, useState } from "react";
import MessageRow from "@/components/chat/feed/MessageRow";
import { feedMeta } from "@/mockdata/chat";
import type { Message } from "@/types/mockdata/chat";

type ChatFeedProps = {
  messages: Message[];
  onDelete: (messageId: number) => void;
  searchQuery: string;
};

export default function ChatFeed({
  messages,
  onDelete,
  searchQuery,
}: ChatFeedProps) {
  const feedRef = useRef<HTMLElement | null>(null);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);

  useEffect(() => {
    const feed = feedRef.current;

    if (!feed) return;

    feed.scrollTo({
      top: feed.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  useEffect(() => {
    setOpenMenuId(null);
  }, [messages]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;

      if (!event.target.closest('[data-message-menu-root="true"]')) {
        setOpenMenuId(null);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenMenuId(null);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

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
        <div className="mb-6 flex items-center gap-4 py-4">
          <div className="h-px flex-1 bg-[color:color-mix(in_srgb,var(--outline-variant)_20%,transparent)]" />
          <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-[color:color-mix(in_srgb,var(--on-surface-variant)_70%,transparent)]">
            {searchQuery.trim()
              ? `${messages.length} result${messages.length === 1 ? "" : "s"}`
              : feedMeta.dayLabel}
          </span>
          <div className="h-px flex-1 bg-[color:color-mix(in_srgb,var(--outline-variant)_20%,transparent)]" />
        </div>

        {messages.length === 0 ? (
          <div className="rounded-[1.25rem] bg-[var(--surface-container-low)] px-5 py-6 text-sm text-[var(--on-surface-variant)]">
            No messages matched "{searchQuery.trim()}".
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, index) => (
              <MessageRow
                key={message.id}
                message={message}
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
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
