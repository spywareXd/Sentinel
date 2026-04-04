"use client";

import { useEffect, useRef } from "react";
import type { VoteOption, VoteStatus } from "@/hooks/useMetaMaskVote";

type MetaMaskVoteModalProps = {
  isOpen: boolean;
  vote: VoteOption | null;
  status: VoteStatus;
  txHash: string | null;
  error: string | null;
  onClose: () => void;
};

const SEPOLIA_EXPLORER = "https://sepolia.etherscan.io/tx/";

const statusConfig: Record<
  VoteStatus,
  { label: string; subtext: string; icon: string; color: string }
> = {
  idle: {
    label: "Preparing",
    subtext: "Initializing vote...",
    icon: "⏳",
    color: "var(--on-surface-variant)",
  },
  connecting: {
    label: "Connecting Wallet",
    subtext: "Opening MetaMask...",
    icon: "🦊",
    color: "#F6851B",
  },
  wrong_network: {
    label: "Switching Network",
    subtext: "Switching to Sepolia Testnet...",
    icon: "🔄",
    color: "#F6851B",
  },
  awaiting_approval: {
    label: "Awaiting Approval",
    subtext: "Check MetaMask — approve the transaction to cast your vote.",
    icon: "🦊",
    color: "#F6851B",
  },
  pending: {
    label: "Transaction Pending",
    subtext: "Waiting for the transaction to be confirmed on Sepolia...",
    icon: "⛓️",
    color: "var(--primary)",
  },
  syncing: {
    label: "Syncing",
    subtext: "Recording your vote in SentinelDAO...",
    icon: "🔄",
    color: "var(--primary)",
  },
  success: {
    label: "Vote Cast!",
    subtext: "Your vote has been recorded on the blockchain and synced.",
    icon: "✅",
    color: "#22c55e",
  },
  error: {
    label: "Vote Failed",
    subtext: "",
    icon: "❌",
    color: "var(--error)",
  },
};

export default function MetaMaskVoteModal({
  isOpen,
  vote,
  status,
  txHash,
  error,
  onClose,
}: MetaMaskVoteModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  // Close on overlay click
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) {
      if (status === "success" || status === "error") {
        onClose();
      }
    }
  };

  // Trap Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && (status === "success" || status === "error")) {
        onClose();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, status, onClose]);

  if (!isOpen) return null;

  const cfg = statusConfig[status];
  const isActive = !["success", "error"].includes(status);
  const isPunish = vote === "punish";

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        background: "rgba(0,0,0,0.72)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }}
    >
      <div
        className="relative flex w-full max-w-sm flex-col gap-5 rounded-3xl p-7 shadow-2xl"
        style={{
          background:
            "color-mix(in srgb, var(--surface-container-high) 94%, transparent)",
          border:
            "1px solid color-mix(in srgb, var(--outline-variant) 30%, transparent)",
          backdropFilter: "blur(20px)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-sm font-extrabold"
              style={{
                background: isPunish
                  ? "color-mix(in srgb, var(--error) 18%, transparent)"
                  : "color-mix(in srgb, var(--primary) 14%, transparent)",
                color: isPunish ? "var(--error)" : "var(--primary)",
              }}
            >
              {isPunish ? "A" : "D"}
            </span>
            <span className="text-xs font-extrabold uppercase tracking-[0.22em] text-[var(--on-surface-variant)]">
              {isPunish ? "Approve" : "Dismiss"}
            </span>
          </div>
          {(status === "success" || status === "error") && (
            <button
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--on-surface-variant)] transition-colors hover:bg-[var(--surface-container-highest)] hover:text-[var(--on-surface)]"
              aria-label="Close"
            >
              ✕
            </button>
          )}
        </div>

        {/* Status Icon */}
        <div className="flex flex-col items-center gap-4 py-4">
          {/* Animated ring for in-progress states */}
          <div className="relative flex items-center justify-center">
            {isActive && (
              <span
                className="absolute inline-block h-20 w-20 animate-spin rounded-full border-2 border-transparent"
                style={{
                  borderTopColor: cfg.color,
                  borderRightColor: `color-mix(in srgb, ${cfg.color} 30%, transparent)`,
                }}
              />
            )}
            <span
              className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full text-3xl"
              style={{
                background: `color-mix(in srgb, ${cfg.color} 12%, var(--surface-container-lowest))`,
              }}
            >
              {cfg.icon}
            </span>
          </div>

          <div className="text-center">
            <p
              className="text-lg font-extrabold"
              style={{ color: cfg.color }}
            >
              {cfg.label}
            </p>
            <p className="mt-1 text-sm text-[var(--on-surface-variant)]">
              {status === "error" && error ? error : cfg.subtext}
            </p>
          </div>
        </div>

        {/* Tx Hash */}
        {txHash && (
          <div
            className="rounded-xl p-3"
            style={{
              background:
                "color-mix(in srgb, var(--surface-container-lowest) 80%, transparent)",
            }}
          >
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--on-surface-variant)]">
              Transaction Hash
            </p>
            <a
              href={`${SEPOLIA_EXPLORER}${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block truncate font-mono text-xs text-[var(--primary)] hover:underline"
            >
              {txHash}
            </a>
          </div>
        )}

        {/* CTA Buttons */}
        {status === "success" && (
          <button
            onClick={onClose}
            className="w-full rounded-xl py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
            style={{ background: "var(--primary)" }}
          >
            Done
          </button>
        )}

        {status === "error" && (
          <button
            onClick={onClose}
            className="w-full rounded-xl bg-[var(--surface-container-highest)] py-3 text-sm font-bold text-[var(--on-surface)] transition-colors hover:bg-[var(--surface-bright)]"
          >
            Close
          </button>
        )}

        {/* Disclaimer */}
        {isActive && (
          <p className="text-center text-[10px] leading-5 text-[var(--on-surface-variant)]">
            Do not close this window while the transaction is pending.
          </p>
        )}
      </div>
    </div>
  );
}
