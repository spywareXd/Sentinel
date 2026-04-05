"use client";

import { useState } from "react";
import { BrowserProvider, Contract } from "ethers";

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

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? "";
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL ?? "";
const SEPOLIA_CHAIN_ID = "0xaa36a7"; // 11155111 in hex
const LOCAL_BACKEND_URL = "http://localhost:8000";

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

const isLocalHostname = (hostname: string) =>
  hostname === "localhost" || hostname === "127.0.0.1";

const normalizeUrl = (value?: string | null) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

const getBackendCandidates = () => {
  const configuredUrl = normalizeUrl(process.env.NEXT_PUBLIC_BACKEND_URL);
  const hostname = typeof window !== "undefined" ? window.location.hostname : "";
  const runningLocally = isLocalHostname(hostname);

  if (!configuredUrl) {
    return runningLocally ? [LOCAL_BACKEND_URL] : [];
  }

  if (configuredUrl === LOCAL_BACKEND_URL || !runningLocally) {
    return [configuredUrl];
  }

  return [configuredUrl, LOCAL_BACKEND_URL];
};

const getBackendConfigError = () => {
  const configuredUrl = normalizeUrl(process.env.NEXT_PUBLIC_BACKEND_URL);
  const hostname = typeof window !== "undefined" ? window.location.hostname : "";
  const runningLocally = isLocalHostname(hostname);

  if (configuredUrl || runningLocally) {
    return null;
  }

  return "No public backend URL is configured in the deployed frontend bundle. Set NEXT_PUBLIC_BACKEND_URL in Vercel and redeploy.";
};

const isNetworkLikeError = (message: string) =>
  /failed to fetch|networkerror|load failed|fetch failed/i.test(message);

const getSyncFailureDetail = async (resp: Response, baseUrl: string) => {
  const contentType = resp.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const data = (await resp.json().catch(() => null)) as
      | { detail?: unknown; error?: unknown; message?: unknown }
      | null;

    if (typeof data?.detail === "string" && data.detail.trim()) return data.detail;
    if (typeof data?.error === "string" && data.error.trim()) return data.error;
    if (typeof data?.message === "string" && data.message.trim()) return data.message;
  }

  const text = (await resp.text().catch(() => "")).trim();
  if (text) {
    const compactText = text.replace(/\s+/g, " ").slice(0, 240);
    return `Backend sync via ${baseUrl} failed (${resp.status}): ${compactText}`;
  }

  return `Backend sync via ${baseUrl} failed with HTTP ${resp.status}.`;
};

const syncVoteToBackend = async (payload: {
  case_id: string;
  moderator_address: string;
  vote: number;
  tx_hash: string;
}) => {
  let lastFailure =
    getBackendConfigError() ??
    "Could not reach Sentinel backend to sync the vote. Check that backend main.py is running and NEXT_PUBLIC_BACKEND_URL or your tunnel is correct.";
  const backendCandidates = getBackendCandidates();

  if (backendCandidates.length === 0) {
    throw new Error(lastFailure);
  }

  for (const baseUrl of backendCandidates) {
    try {
      const syncResp = await fetch(`${baseUrl}/moderation/vote/sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "bypass-tunnel-reminder": "true",
        },
        body: JSON.stringify(payload),
      });

      if (syncResp.ok) {
        return;
      }

      lastFailure = await getSyncFailureDetail(syncResp, baseUrl);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      lastFailure = isNetworkLikeError(message)
        ? `Could not reach Sentinel backend at ${baseUrl}. Check that backend main.py is running and your tunnel or NEXT_PUBLIC_BACKEND_URL is still valid.`
        : message;
    }
  }

  throw new Error(lastFailure);
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
    // --- 0. Prevent parallel calls ---
    if (status !== "idle" && status !== "success" && status !== "error") {
      return;
    }

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
        } catch (switchErr: unknown) {
          // Chain not added to MetaMask — add it
          if (switchErr && typeof switchErr === "object" && "code" in switchErr && switchErr.code === 4902) {
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
                  rpcUrls: [RPC_URL],
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
      const signerAddress = (await signer.getAddress()).toLowerCase();
      const expectedModeratorAddress = moderatorAddress.toLowerCase();
      const contract = new Contract(CONTRACT_ADDRESS, SENTINEL_ABI, signer);

      if (expectedModeratorAddress && signerAddress !== expectedModeratorAddress) {
        console.warn(
          `MetaMask signer ${signerAddress} does not match assigned moderator wallet ${expectedModeratorAddress}. Using signer address for backend sync.`
        );
      }

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
      await syncVoteToBackend({
        case_id: supabaseCaseId,
        moderator_address: signerAddress,
        vote: voteCode,
        tx_hash: tx.hash,
      });

      setStatus("success");
    } catch (err: unknown) {
      console.error("MetaMask vote error:", err);

      const errorMessage = err instanceof Error ? err.message : String(err);
      const errorCode = (err as { code?: number | string })?.code;
      const shortMessage = (err as { shortMessage?: string })?.shortMessage;

      if (errorCode === 4001 || errorCode === "ACTION_REJECTED") {
        setError("You rejected the transaction in MetaMask.");
      } else if (errorMessage?.includes("insufficient funds")) {
        setError("Insufficient ETH for gas fees on Sepolia.");
      } else {
        setError(shortMessage ?? errorMessage ?? "An unknown error occurred.");
      }
      setStatus("error");
    }
  };

  return { status, txHash, error, castVote, reset };
}

// Augment window for TypeScript
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on?: (eventName: string, handler: (params: unknown) => void) => void;
      removeListener?: (eventName: string, handler: (params: unknown) => void) => void;
    };
  }
}
