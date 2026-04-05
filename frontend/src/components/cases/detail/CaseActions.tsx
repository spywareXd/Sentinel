"use client";

import { useState } from "react";
import { useMetaMaskVote, type VoteOption } from "@/hooks/useMetaMaskVote";
import MetaMaskVoteModal from "@/components/cases/MetaMaskVoteModal";
import type { CaseDecision } from "@/types/mockdata/cases";

type CaseActionsProps = {
  isResolved: boolean;
  needsVote: boolean;
  decision: CaseDecision;
  blockchainCaseId: number | null;
  supabaseCaseId: string;
  moderatorAddress: string;
  onVoteResolved: (decision: "Punished" | "Dismissed") => void;
  onVoteRecorded: () => void;
  onVoteRecordedOnChain: (decision: "Punished" | "Dismissed") => void;
};

export default function CaseActions({
  isResolved,
  needsVote,
  decision,
  blockchainCaseId,
  supabaseCaseId,
  moderatorAddress,
  onVoteResolved,
  onVoteRecorded,
  onVoteRecordedOnChain,
}: CaseActionsProps) {
  const [pendingVote, setPendingVote] = useState<VoteOption | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { status, txHash, error, syncResult, castVote, reset } = useMetaMaskVote();

  const handleVote = async (vote: VoteOption) => {
    // 1. Guard against parallel calls
    if (
      status !== "idle" &&
      status !== "success" &&
      status !== "recorded_on_chain" &&
      status !== "error"
    ) {
      return;
    }

    // 2. Validate prerequisites
    if (blockchainCaseId === null) {
      alert(
        "This case hasn't been registered on the blockchain yet. Please wait or retry chain sync."
      );
      return;
    }
    if (!moderatorAddress) {
      alert(
        "Your profile doesn't have a wallet address linked. Please add one in your settings."
      );
      return;
    }

    // 3. Initiate vote
    setPendingVote(vote);
    setIsModalOpen(true);
    reset();

    await castVote(blockchainCaseId, supabaseCaseId, vote, moderatorAddress);
  };

  const handleModalClose = () => {
    if (status === "success") {
      if (syncResult?.caseResolved && syncResult.finalDecision) {
        onVoteResolved(syncResult.finalDecision);
      } else {
        onVoteRecorded();
      }
    }
    if (status === "recorded_on_chain" && pendingVote) {
      onVoteRecordedOnChain(
        pendingVote === "punish" ? "Punished" : "Dismissed"
      );
    }
    setIsModalOpen(false);
    setPendingVote(null);
    reset();
  };

  if (isResolved) {
    return (
      <div className="border-t border-[color:color-mix(in_srgb,var(--outline-variant)_20%,transparent)] pt-4">
        <div className="rounded-xl bg-[var(--surface-container-highest)] px-4 py-3 text-center text-sm font-bold text-[var(--on-surface)]">
          Verdict — {decision ?? "Resolved"}
        </div>
      </div>
    );
  }

  if (!needsVote) {
    return (
      <div className="border-t border-[color:color-mix(in_srgb,var(--outline-variant)_20%,transparent)] pt-4">
        <div className="rounded-xl bg-[var(--surface-container-highest)] px-4 py-3 text-center text-sm font-semibold text-[var(--on-surface)]">
          Your vote is already recorded on-chain. This case has been moved to history
          while Sentinel catches up.
        </div>
      </div>
    );
  }

  const noChain = blockchainCaseId === null;
  const isVoting =
    status !== "idle" &&
    status !== "success" &&
    status !== "recorded_on_chain" &&
    status !== "error";

  return (
    <>
      <div className="flex flex-col gap-3 border-t border-[color:color-mix(in_srgb,var(--outline-variant)_20%,transparent)] pt-4">
        {noChain && (
          <p className="rounded-lg bg-[color:color-mix(in_srgb,var(--error)_10%,transparent)] px-3 py-2 text-center text-[10px] font-semibold text-[var(--error)]">
            ⚠ Case not yet on-chain. Voting is disabled until chain sync completes.
          </p>
        )}
        <div className="flex gap-3">
          <button
            type="button"
            id="case-action-dismiss"
            onClick={() => handleVote("dismiss")}
            disabled={noChain || isVoting}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--surface-container-highest)] py-3 text-sm font-bold text-[var(--on-surface)] transition-colors hover:bg-[var(--surface-bright)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-[var(--surface-container-highest)]"
          >
            Dismiss
          </button>
          <button
            type="button"
            id="case-action-punish"
            onClick={() => handleVote("punish")}
            disabled={noChain || isVoting}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#b91c1c] bg-gradient-to-b from-[#ef4444] to-[#dc2626] py-3 text-sm font-bold text-white shadow-[0_3px_8px_rgba(127,29,29,0.16)] transition-[transform,box-shadow,filter] hover:brightness-105 hover:shadow-[0_5px_12px_rgba(127,29,29,0.2)] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:shadow-[0_3px_8px_rgba(127,29,29,0.16)]"
          >
            Approve
          </button>
        </div>
      </div>

      <MetaMaskVoteModal
        isOpen={isModalOpen}
        vote={pendingVote}
        status={status}
        txHash={txHash}
        error={error}
        onClose={handleModalClose}
      />
    </>
  );
}
