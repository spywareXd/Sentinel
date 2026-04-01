"use client";

import { useState } from "react";
import { AtSign, PlusCircle, Send, Smile } from "lucide-react";
import { feedMeta } from "@/mockdata/chat";

type ComposerProps = {
  onSend: (text: string) => void;
  disabled?: boolean;
  disabledReason?: string | null;
};

export default function Composer({
  onSend,
  disabled = false,
  disabledReason = null,
}: ComposerProps) {
  const [draft, setDraft] = useState("");
  const isDrafting = draft.trim().length > 0;

  const submitMessage = () => {
    const trimmedDraft = draft.trim();

    if (!trimmedDraft || disabled) return;

    onSend(trimmedDraft);
    setDraft("");
  };

  return (
    <footer className="shrink-0 bg-[var(--background)] px-6 py-5">
      <div className="w-full">
        <div className="rounded-[1.25rem] bg-[var(--composer-bg)] p-2 shadow-[0_20px_40px_rgba(6,14,32,0.4)]">
          <div className="flex items-center gap-4 rounded-xl bg-[color:color-mix(in_srgb,var(--surface-container-high)_30%,transparent)] px-4 py-3">
            <button className="shrink-0 text-[var(--on-surface-variant)] transition-colors hover:text-[var(--secondary)]">
              <PlusCircle className="h-5 w-5" />
            </button>

            <input
              type="text"
              placeholder={
                disabled ? "Messaging is temporarily disabled." : feedMeta.composerPlaceholder
              }
              value={draft}
              disabled={disabled}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  submitMessage();
                }
              }}
              className="flex-1 bg-transparent text-sm text-[var(--on-surface)] outline-none placeholder:text-[color:color-mix(in_srgb,var(--on-surface-variant)_40%,transparent)] disabled:cursor-not-allowed disabled:text-[color:color-mix(in_srgb,var(--on-surface-variant)_75%,transparent)]"
            />

            <div className="flex shrink-0 items-center gap-3">
              <button className="text-[var(--on-surface-variant)] transition-colors hover:text-[var(--tertiary)]">
                <Smile className="h-5 w-5" />
              </button>
              <button className="text-[var(--on-surface-variant)] transition-colors hover:text-[var(--primary)]">
                <AtSign className="h-5 w-5" />
              </button>
              <button
                onClick={submitMessage}
                disabled={disabled || !draft.trim()}
                className="rounded-full bg-gradient-to-tr from-[var(--primary)] to-[var(--primary-container)] p-2.5 text-[#07006c] shadow-[0_0_20px_rgba(192,193,255,0.4)] transition-all hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:scale-100 disabled:shadow-none"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between px-2">
          <p className="text-[10px] text-[color:color-mix(in_srgb,var(--on-surface-variant)_50%,transparent)]">
            {disabledReason ?? feedMeta.helperText}
          </p>

          <div className="flex items-center gap-2">
            {!disabled && isDrafting && (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <p className="text-[10px] text-[color:color-mix(in_srgb,var(--on-surface-variant)_70%,transparent)]">
                  You are typing...
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
