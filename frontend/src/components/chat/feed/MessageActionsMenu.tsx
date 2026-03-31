import { Copy, Flag, MoreHorizontal, Trash2 } from "lucide-react";

type MessageActionsMenuProps = {
  isSelf: boolean;
  isOpen: boolean;
  shouldOpenUp: boolean;
  onToggle: () => void;
  onCopy: () => void;
  onDelete: () => void;
  onClose: () => void;
};

export default function MessageActionsMenu({
  isSelf,
  isOpen,
  shouldOpenUp,
  onToggle,
  onCopy,
  onDelete,
  onClose,
}: MessageActionsMenuProps) {
  return (
    <>
      <button
        onClick={onToggle}
        className={[
          "absolute top-3 z-10 rounded-lg p-1.5 text-[var(--on-surface-variant)] opacity-0 transition-all hover:bg-[var(--surface-container-high)] hover:text-[var(--on-surface)] group-hover:opacity-100",
          isSelf ? "right-full mr-2" : "left-full ml-2",
          isOpen ? "opacity-100" : "",
        ].join(" ")}
        aria-label="Open message actions"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {isOpen && (
        <div
          className={[
            "absolute z-20 min-w-40 rounded-xl border border-[color:color-mix(in_srgb,var(--outline-variant)_35%,transparent)] bg-[var(--surface-container-high)] p-1 shadow-[0_16px_40px_rgba(4,8,20,0.45)]",
            isSelf ? "right-full mr-2" : "left-full ml-2",
            shouldOpenUp ? "bottom-0" : "top-0",
          ].join(" ")}
        >
          <button
            onClick={onCopy}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-[var(--on-surface)] transition-colors hover:bg-[var(--surface-container-highest)]"
          >
            <Copy className="h-4 w-4" />
            Copy message
          </button>

          {isSelf ? (
            <button
              onClick={onDelete}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-[#ffb4ab] transition-colors hover:bg-[color:color-mix(in_srgb,#ffb4ab_12%,transparent)]"
            >
              <Trash2 className="h-4 w-4" />
              Delete message
            </button>
          ) : (
            <button
              onClick={onClose}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-[var(--on-surface)] transition-colors hover:bg-[var(--surface-container-highest)]"
            >
              <Flag className="h-4 w-4" />
              Report message
            </button>
          )}
        </div>
      )}
    </>
  );
}
