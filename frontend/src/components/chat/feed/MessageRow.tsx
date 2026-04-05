import ProfileLogo from "@/components/ui/ProfileLogo";
import MessageActionsMenu from "@/components/chat/feed/MessageActionsMenu";
import type { Message } from "@/types/mockdata/chat";
import { AlertCircle } from "lucide-react";

const toneClassMap = {
  primary: "text-[var(--primary)]",
  secondary: "text-[var(--secondary)]",
  tertiary: "text-[var(--tertiary)]",
  self: "text-[var(--on-surface)]",
};

type MessageRowProps = {
  message: Message;
  shouldOpenUp: boolean;
  isMenuOpen: boolean;
  onToggleMenu: () => void;
  onCopy: (text: string) => void;
  onDelete: (messageId: string) => void;
  onCloseMenu: () => void;
};

export default function MessageRow({
  message,
  shouldOpenUp,
  isMenuOpen,
  onToggleMenu,
  onCopy,
  onDelete,
  onCloseMenu,
}: MessageRowProps) {
  const isSelf = message.tone === "self";

  return (
    <div
      className={[
        "group flex gap-4",
        isSelf ? "flex-row-reverse" : "",
        message.grouped ? (isSelf ? "mr-14" : "ml-14") : "",
      ].join(" ")}
    >
      {!message.grouped && (
        <div className="relative shrink-0">
          <ProfileLogo
            name={message.author}
            initials={message.authorInitials}
            logoUrl={message.authorLogoUrl}
            className="h-10 w-10 rounded-xl object-cover"
            fallbackClassName={[
              "flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold",
              isSelf
                ? "bg-[color:color-mix(in_srgb,var(--primary)_15%,transparent)] text-[var(--primary)]"
              : "bg-[var(--surface-container-high)] text-[var(--on-surface)]",
            ].join(" ")}
          />
        </div>
      )}

      <div className={["relative flex flex-col gap-1", isSelf ? "items-end" : ""].join(" ")}>
        {!message.grouped && (
          <div className="flex items-baseline gap-2">
            <span className={["text-sm font-bold", toneClassMap[message.tone]].join(" ")}>
              {message.author}
            </span>
            {message.flagged && (
              <span
                className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-[color:color-mix(in_srgb,var(--error)_32%,transparent)] bg-[color:color-mix(in_srgb,var(--error)_16%,var(--surface-container-lowest))] text-[var(--error)] shadow-[0_4px_12px_rgba(127,29,29,0.16)]"
                title="Flagged for moderation"
              >
                <AlertCircle className="h-2.5 w-2.5" />
              </span>
            )}
            <span className="text-[10px] text-[var(--on-surface-variant)]">
              {message.time}
            </span>
          </div>
        )}

        <div className="relative" data-message-menu-root="true">
          <MessageActionsMenu
            isSelf={isSelf}
            isOpen={isMenuOpen}
            shouldOpenUp={shouldOpenUp}
            onToggle={onToggleMenu}
            onCopy={() => onCopy(message.text)}
            onDelete={() => onDelete(message.id)}
            onClose={onCloseMenu}
          />

          <div
            className={[
              "max-w-2xl rounded-xl p-4 text-sm leading-7 shadow-sm transition-all duration-300",
              isSelf
                ? "rounded-tr-sm bg-[var(--surface-container-high)] text-[var(--on-surface)]"
                : "rounded-tl-sm bg-[var(--surface-container-high)] text-[var(--on-surface)]",
              message.isFocused
                ? "ring-1 ring-[color:color-mix(in_srgb,var(--error)_72%,white_28%)] shadow-[0_0_0_1px_color-mix(in_srgb,var(--error)_16%,transparent),0_10px_24px_rgba(127,29,29,0.12)]"
                : "",
            ].join(" ")}
          >
            {message.text}
          </div>
        </div>
      </div>
    </div>
  );
}
