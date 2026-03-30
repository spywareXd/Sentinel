import { AtSign, PlusCircle, Send, Smile } from "lucide-react";
import { feedMeta } from "@/mockdata/chat";
import { typingUser } from "@/mockdata/user";

export default function Composer() {
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
              placeholder={feedMeta.composerPlaceholder}
              className="flex-1 bg-transparent text-sm text-[var(--on-surface)] outline-none placeholder:text-[color:color-mix(in_srgb,var(--on-surface-variant)_40%,transparent)]"
            />

            <div className="flex shrink-0 items-center gap-3">
              <button className="text-[var(--on-surface-variant)] transition-colors hover:text-[var(--tertiary)]">
                <Smile className="h-5 w-5" />
              </button>
              <button className="text-[var(--on-surface-variant)] transition-colors hover:text-[var(--primary)]">
                <AtSign className="h-5 w-5" />
              </button>
              <button className="rounded-lg bg-[var(--primary)] p-2 text-[#07006c] transition-opacity hover:opacity-90">
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between px-2">
          <p className="text-[10px] text-[color:color-mix(in_srgb,var(--on-surface-variant)_50%,transparent)]">
            {feedMeta.helperText}
          </p>

          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <p className="text-[10px] text-[color:color-mix(in_srgb,var(--on-surface-variant)_70%,transparent)]">
              {typingUser.name} is typing...
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
