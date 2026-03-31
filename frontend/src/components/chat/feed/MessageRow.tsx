import ProfileLogo from "@/components/ui/ProfileLogo";
import MessageActionsMenu from "@/components/chat/feed/MessageActionsMenu";
import type { Message } from "@/types/mockdata/chat";

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
            <span className={["text-sm font-bold", toneClassMap[message.tone]].join(" ")}>
              {message.author}
            </span>
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
              "max-w-2xl rounded-xl p-4 text-sm leading-7 shadow-sm",
              isSelf
                ? "rounded-tr-sm bg-[color:color-mix(in_srgb,var(--primary)_16%,transparent)] text-[var(--on-surface)]"
                : "rounded-tl-sm bg-[var(--bubble-bg)] text-[var(--on-surface)]",
            ].join(" ")}
          >
            {message.text}
          </div>
        </div>
      </div>
    </div>
  );
}
