"use client";

import { useState } from "react";
import { BrowserProvider, Contract, parseUnits } from "ethers";

// Minimal ABI — only the castVote function
const SENTINEL_ABI = [
  {
    inputs: [
      { internalType: "uint256", name: "_caseId", type: "uint256" },
      { internalType: "uint8", name: "_vote", type: "uint8" },
    ],
    name: "castVote",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "_caseId", type: "uint256" },
      { internalType: "address", name: "_moderator", type: "address" },
    ],
    name: "getVote",
    outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS!;
const SEPOLIA_CHAIN_ID = "0xaa36a7"; // 11155111 in hex

export type VoteOption = "punish" | "dismiss";

export type VoteStatus =
  | "idle"
  | "connecting"
  | "wrong_network"
  | "awaiting_approval"
  | "pending"
  | "syncing"
  | "success"
  | "error";

export type UseMetaMaskVoteReturn = {
  status: VoteStatus;
  txHash: string | null;
  error: string | null;
  castVote: (
    blockchainCaseId: number,
    supabaseCaseId: string,
    vote: VoteOption,
    moderatorAddress: string
  ) => Promise<void>;
  reset: () => void;
};

/**
 * Hook that drives the full MetaMask vote flow:
 * 1. Connects MetaMask
 * 2. Switches to Sepolia if needed
 * 3. Prompts the user to approve the castVote() transaction
 * 4. Waits for confirmation
 * 5. Calls the backend /moderation/vote/sync to persist the result
 */
export function useMetaMaskVote(): UseMetaMaskVoteReturn {
  const [status, setStatus] = useState<VoteStatus>("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setStatus("idle");
    setTxHash(null);
    setError(null);
  };

  const castVote = async (
    blockchainCaseId: number,
    supabaseCaseId: string,
    vote: VoteOption,
    moderatorAddress: string
  ) => {
    setError(null);
    setTxHash(null);

    // --- 1. Check MetaMask availability ---
    if (typeof window === "undefined" || !window.ethereum) {
      setError("MetaMask is not installed. Please install it to vote.");
      setStatus("error");
      return;
    }

    try {
      // --- 2. Connect / request accounts ---
      setStatus("connecting");
      const provider = new BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);

      // --- 3. Ensure correct network (Sepolia) ---
      const network = await provider.getNetwork();
      if (network.chainId !== BigInt(11155111)) {
        setStatus("wrong_network");
        try {
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: SEPOLIA_CHAIN_ID }],
          });
        } catch (switchErr: any) {
          // Chain not added to MetaMask — add it
          if (switchErr.code === 4902) {
            await window.ethereum.request({
              method: "wallet_addEthereumChain",
              params: [
                {
                  chainId: SEPOLIA_CHAIN_ID,
                  chainName: "Sepolia Testnet",
                  nativeCurrency: {
                    name: "Sepolia ETH",
                    symbol: "ETH",
                    decimals: 18,
                  },
                  rpcUrls: [process.env.NEXT_PUBLIC_RPC_URL],
                  blockExplorerUrls: ["https://sepolia.etherscan.io"],
                },
              ],
            });
          } else {
            throw switchErr;
          }
        }
      }

      // Re-get provider after potential network switch
      const signer = await new BrowserProvider(window.ethereum).getSigner();
      const contract = new Contract(CONTRACT_ADDRESS, SENTINEL_ABI, signer);

      // vote encoding: 1 = punish, 2 = dismiss
      const voteCode = vote === "punish" ? 1 : 2;

      // --- 4. Send the transaction — MetaMask popup appears here ---
      setStatus("awaiting_approval");
      const tx = await contract.castVote(BigInt(blockchainCaseId), voteCode);

      setTxHash(tx.hash);
      setStatus("pending");

      // --- 5. Wait for confirmation ---
      await tx.wait(1);

      // --- 6. Sync result to backend ---
      setStatus("syncing");
      const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";
      const syncResp = await fetch(`${BACKEND}/moderation/vote/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          case_id: supabaseCaseId,
          moderator_address: moderatorAddress.toLowerCase(),
          vote: voteCode,
          tx_hash: tx.hash,
        }),
      });

      if (!syncResp.ok) {
        const data = await syncResp.json().catch(() => ({}));
        // Non-fatal: the vote IS on-chain, backend sync is best-effort
        console.warn("Backend sync warning:", data);
      }

      setStatus("success");
    } catch (err: any) {
      console.error("MetaMask vote error:", err);

      if (err.code === 4001 || err.code === "ACTION_REJECTED") {
        setError("You rejected the transaction in MetaMask.");
      } else if (err.message?.includes("insufficient funds")) {
        setError("Insufficient ETH for gas fees on Sepolia.");
      } else {
        setError(err.shortMessage ?? err.message ?? "An unknown error occurred.");
      }
      setStatus("error");
    }
  };

  return { status, txHash, error, castVote, reset };
}

// Augment window for TypeScript
declare global {
  interface Window {
    ethereum?: any;
  }
}
