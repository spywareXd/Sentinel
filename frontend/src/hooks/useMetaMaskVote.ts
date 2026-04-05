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
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "caseId", type: "uint256" },
      { indexed: true, internalType: "address", name: "moderator", type: "address" },
      { indexed: false, internalType: "uint8", name: "decision", type: "uint8" },
    ],
    name: "VoteCast",
    type: "event",
  },
] as const;

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? "";
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL ?? "";
const SEPOLIA_CHAIN_ID = "0xaa36a7"; // 11155111 in hex
const LOCAL_BACKEND_URL = "http://localhost:8000";
const LOOPBACK_BACKEND_URLS = [LOCAL_BACKEND_URL, "http://127.0.0.1:8000"];

export type VoteOption = "punish" | "dismiss";

export type VoteStatus =
  | "idle"
  | "connecting"
  | "wrong_network"
  | "awaiting_approval"
  | "pending"
  | "syncing"
  | "recorded_on_chain"
  | "success"
  | "error";

export type VoteSyncResult = {
  caseResolved: boolean;
  finalDecision: "Punished" | "Dismissed" | null;
};

export type UseMetaMaskVoteReturn = {
  status: VoteStatus;
  txHash: string | null;
  error: string | null;
  syncResult: VoteSyncResult | null;
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

const addUniqueUrl = (urls: string[], value?: string | null) => {
  const normalized = normalizeUrl(value);
  if (!normalized || urls.includes(normalized)) return urls;
  return [...urls, normalized];
};

const isLoopbackUrl = (value?: string | null) => {
  if (!value) return false;

  try {
    const hostname = new URL(value).hostname.toLowerCase();
    return hostname === "localhost" || hostname === "127.0.0.1";
  } catch {
    return false;
  }
};

const isInsecureHttpUrl = (value?: string | null) => {
  if (!value) return false;

  try {
    return new URL(value).protocol === "http:";
  } catch {
    return false;
  }
};

const needsTunnelBypassHeader = (value: string) => {
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    return hostname === "loca.lt" || hostname.endsWith(".loca.lt");
  } catch {
    return false;
  }
};

const getBackendCandidates = () => {
  const configuredUrl = normalizeUrl(process.env.NEXT_PUBLIC_BACKEND_URL);
  const hostname = typeof window !== "undefined" ? window.location.hostname : "";
  const protocol = typeof window !== "undefined" ? window.location.protocol : "";
  const runningLocally = isLocalHostname(hostname);
  const runningOnSecurePage = protocol === "https:";

  if (!configuredUrl) {
    return runningLocally ? LOOPBACK_BACKEND_URLS : [];
  }

  if (!runningLocally && isLoopbackUrl(configuredUrl)) {
    return [];
  }

  if (!runningLocally && runningOnSecurePage && isInsecureHttpUrl(configuredUrl)) {
    return [];
  }

  if (!runningLocally) {
    return [configuredUrl];
  }

  let candidates = addUniqueUrl([], configuredUrl);

  if (isLoopbackUrl(configuredUrl)) {
    for (const localUrl of LOOPBACK_BACKEND_URLS) {
      candidates = addUniqueUrl(candidates, localUrl);
    }
    return candidates;
  }

  for (const localUrl of LOOPBACK_BACKEND_URLS) {
    candidates = addUniqueUrl(candidates, localUrl);
  }

  return candidates;
};

const getBackendConfigError = () => {
  const configuredUrl = normalizeUrl(process.env.NEXT_PUBLIC_BACKEND_URL);
  const hostname = typeof window !== "undefined" ? window.location.hostname : "";
  const protocol = typeof window !== "undefined" ? window.location.protocol : "";
  const runningLocally = isLocalHostname(hostname);
  const runningOnSecurePage = protocol === "https:";

  if (!runningLocally && isLoopbackUrl(configuredUrl)) {
    return "The deployed frontend bundle is pointing at localhost for the backend. Set NEXT_PUBLIC_BACKEND_URL to a public HTTPS backend URL in Vercel and redeploy.";
  }

  if (!runningLocally && runningOnSecurePage && isInsecureHttpUrl(configuredUrl)) {
    return "The deployed frontend bundle is pointing at an insecure HTTP backend URL. Set NEXT_PUBLIC_BACKEND_URL to a public HTTPS backend URL in Vercel and redeploy.";
  }

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
          ...(needsTunnelBypassHeader(baseUrl)
            ? { "bypass-tunnel-reminder": "true" }
            : {}),
        },
        body: JSON.stringify(payload),
      });

      if (syncResp.ok) {
        const data = (await syncResp.json().catch(() => null)) as
          | { case_resolved?: boolean; decision?: string | null }
          | null;

        const finalDecision =
          data?.decision === "punish"
            ? "Punished"
            : data?.decision === "dismiss"
              ? "Dismissed"
              : null;

        return {
          caseResolved: Boolean(data?.case_resolved),
          finalDecision,
        } satisfies VoteSyncResult;
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

const hasVoteCastEventInReceipt = (
  contract: Contract,
  receipt: {
    logs?: Array<{ topics: readonly string[]; data: string }>;
  } | null,
  blockchainCaseId: number,
  moderatorAddress: string,
  voteCode: number
) => {
  if (!receipt?.logs?.length) {
    return false;
  }

  const expectedModeratorAddress = moderatorAddress.toLowerCase();

  for (const log of receipt.logs) {
    try {
      const parsedLog = contract.interface.parseLog({
        topics: [...log.topics],
        data: log.data,
      });

      if (!parsedLog || parsedLog.name !== "VoteCast") {
        continue;
      }

      const parsedCaseId = Number(parsedLog.args.caseId ?? parsedLog.args[0]);
      const parsedModerator = String(
        parsedLog.args.moderator ?? parsedLog.args[1]
      ).toLowerCase();
      const parsedDecision = Number(
        parsedLog.args.decision ?? parsedLog.args[2]
      );

      if (
        parsedCaseId === blockchainCaseId &&
        parsedModerator === expectedModeratorAddress &&
        parsedDecision === voteCode
      ) {
        return true;
      }
    } catch {
      continue;
    }
  }

  return false;
};

const hasRecordedVoteForModerator = async (
  contract: Contract,
  blockchainCaseId: number,
  moderatorAddress: string,
) => {
  try {
    const recordedVote = await contract.getVote(
      BigInt(blockchainCaseId),
      moderatorAddress,
    );

    return Number(recordedVote) > 0;
  } catch (err) {
    console.error("Could not verify already-recorded vote:", err);
    return false;
  }
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
  const [syncResult, setSyncResult] = useState<VoteSyncResult | null>(null);

  const reset = () => {
    setStatus("idle");
    setTxHash(null);
    setError(null);
    setSyncResult(null);
  };

  const castVote = async (
    blockchainCaseId: number,
    supabaseCaseId: string,
    vote: VoteOption,
    moderatorAddress: string
  ) => {
    let contract: Contract | null = null;
    let signerAddress = "";

    // --- 0. Prevent parallel calls ---
    if (
      status !== "idle" &&
      status !== "success" &&
      status !== "recorded_on_chain" &&
      status !== "error"
    ) {
      return;
    }

    setError(null);
    setTxHash(null);
    setSyncResult(null);

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
      signerAddress = (await signer.getAddress()).toLowerCase();
      const expectedModeratorAddress = moderatorAddress.toLowerCase();
      contract = new Contract(CONTRACT_ADDRESS, SENTINEL_ABI, signer);

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
      const receipt = await tx.wait(1);

      // --- 6. Sync result to backend ---
      setStatus("syncing");
      try {
        const backendSyncResult = await syncVoteToBackend({
          case_id: supabaseCaseId,
          moderator_address: signerAddress,
          vote: voteCode,
          tx_hash: tx.hash,
        });
        setSyncResult(backendSyncResult);
      } catch (syncErr: unknown) {
        const syncErrorMessage =
          syncErr instanceof Error ? syncErr.message : String(syncErr);
        const voteRecordedOnChain = hasVoteCastEventInReceipt(
          contract,
          receipt,
          blockchainCaseId,
          signerAddress,
          voteCode
        );

        if (voteRecordedOnChain) {
          setError(syncErrorMessage);
          setStatus("recorded_on_chain");
          return;
        }

        throw syncErr;
      }

      setStatus("success");
    } catch (err: unknown) {
      console.error("MetaMask vote error:", err);

      const errorMessage = err instanceof Error ? err.message : String(err);
      const errorCode = (err as { code?: number | string })?.code;
      const shortMessage = (err as { shortMessage?: string })?.shortMessage;
      const combinedMessage = `${shortMessage ?? ""} ${errorMessage ?? ""}`.toLowerCase();

      if (
        contract &&
        signerAddress &&
        /already voted/.test(combinedMessage) &&
        (await hasRecordedVoteForModerator(contract, blockchainCaseId, signerAddress))
      ) {
        setError(
          "This wallet already has a recorded on-chain vote for this case. Moving it to history locally while Sentinel catches up.",
        );
        setStatus("recorded_on_chain");
        return;
      }

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

  return { status, txHash, error, syncResult, castVote, reset };
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
