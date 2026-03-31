"use client";

import { useEffect, useRef, useState } from "react";
import { Copy, Flag, MoreHorizontal, Trash2 } from "lucide-react";
import ProfileLogo from "@/components/ui/ProfileLogo";
import { feedMeta } from "@/mockdata/chat";
import type { Message } from "@/types/mockdata/chat";

const toneClassMap = {
  primary: "text-[var(--primary)]",
  secondary: "text-[var(--secondary)]",
  tertiary: "text-[var(--tertiary)]",
  self: "text-[var(--on-surface)]",
};

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
          {messages.map((message, index) => {
            const isSelf = message.tone === "self";
            const shouldOpenUp = index >= messages.length - 3;

            return (
              <div
                key={message.id}
                className={[
                  "group flex gap-4",
                  isSelf ? "flex-row-reverse" : "",
                  message.grouped ? "ml-14" : "",
                ].join(" ")}
              >
                {!message.grouped && (
                  <ProfileLogo
                    name={message.author}
                    initials={message.authorInitials}
                    logoUrl={message.authorLogoUrl}
                    className="h-10 w-10 shrink-0 rounded-xl object-cover"
                    fallbackClassName={[
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold",
                      isSelf
                        ? "bg-[color:color-mix(in_srgb,var(--primary)_15%,transparent)] text-[var(--primary)]"
                        : "bg-[var(--surface-container-high)] text-[var(--on-surface)]",
                    ].join(" ")}
                  />
                )}

                <div className={["relative flex flex-col gap-1", isSelf ? "items-end" : ""].join(" ")}>
                  {!message.grouped && (
                    <div className="flex items-baseline gap-2">
                      <span
                        className={[
                          "text-sm font-bold",
                          toneClassMap[message.tone],
                        ].join(" ")}
                      >
                        {message.author}
                      </span>
                      <span className="text-[10px] text-[var(--on-surface-variant)]">
                        {message.time}
                      </span>
                    </div>
                  )}

                  <div className="relative" data-message-menu-root="true">
                    <button
                      onClick={() =>
                        setOpenMenuId((currentId) =>
                          currentId === message.id ? null : message.id,
                        )
                      }
                      className={[
                        "absolute top-3 z-10 rounded-lg p-1.5 text-[var(--on-surface-variant)] opacity-0 transition-all hover:bg-[var(--surface-container-high)] hover:text-[var(--on-surface)] group-hover:opacity-100",
                        isSelf ? "right-full mr-2" : "left-full ml-2",
                        openMenuId === message.id ? "opacity-100" : "",
                      ].join(" ")}
                      aria-label="Open message actions"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>

                    <div
                      className={[
                        "max-w-2xl rounded-xl p-4 text-sm leading-7 shadow-sm",
                        isSelf
                          ? "rounded-tr-sm bg-[color:color-mix(in_srgb,var(--primary)_16%,transparent)] text-[var(--on-surface)]"
                          : "rounded-tl-sm bg-[var(--bubble-bg)] text-[var(--on-surface)]",
                      ].join(" ")}
                    >
                      {message.text}
                    </div>

                    {openMenuId === message.id && (
                      <div
                        className={[
                          "absolute z-20 min-w-40 rounded-xl border border-[color:color-mix(in_srgb,var(--outline-variant)_35%,transparent)] bg-[var(--surface-container-high)] p-1 shadow-[0_16px_40px_rgba(4,8,20,0.45)]",
                          isSelf ? "right-full mr-2" : "left-full ml-2",
                          shouldOpenUp ? "bottom-0" : "top-0",
                        ].join(" ")}
                      >
                        <button
                          onClick={() => void handleCopy(message.text)}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-[var(--on-surface)] transition-colors hover:bg-[var(--surface-container-highest)]"
                        >
                          <Copy className="h-4 w-4" />
                          Copy message
                        </button>

                        {isSelf ? (
                          <button
                            onClick={() => {
                              onDelete(message.id);
                              setOpenMenuId(null);
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-[#ffb4ab] transition-colors hover:bg-[color:color-mix(in_srgb,#ffb4ab_12%,transparent)]"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete message
                          </button>
                        ) : (
                          <button
                            onClick={() => setOpenMenuId(null)}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-[var(--on-surface)] transition-colors hover:bg-[var(--surface-container-highest)]"
                          >
                            <Flag className="h-4 w-4" />
                            Report message
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        )}
      </div>
    </section>
  );
}
