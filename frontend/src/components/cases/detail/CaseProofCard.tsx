import type { CaseRecord } from "@/types/mockdata/cases";
import { Link2 } from "lucide-react";

type CaseProofCardProps = {
  caseItem: CaseRecord;
};

export default function CaseProofCard({ caseItem }: CaseProofCardProps) {
  // Use txHash if available, otherwise fallback to contract address
  const txUrl = caseItem.txHash 
    ? `https://sepolia.etherscan.io/tx/${caseItem.txHash}`
    : `https://sepolia.etherscan.io/address/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045`; // Fallback (placeholder contract)

  return (
    <div
      id="cases-proof"
      className="flex items-center justify-between rounded-2xl border border-[color:color-mix(in_srgb,var(--outline-variant)_20%,transparent)] bg-[color:color-mix(in_srgb,var(--surface-container)_50%,transparent)] p-4"
    >
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--on-surface-variant)]">
          Address
        </p>
        <a 
          href={txUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="group mt-1 flex items-center gap-1.5 transition-colors hover:text-[var(--primary)]"
        >
          <p className="truncate font-mono text-[10px] text-[var(--secondary)] group-hover:text-[var(--primary)]">
            {caseItem.txHash || caseItem.chainRef}
          </p>
          <Link2 className="h-3 w-3 opacity-40 transition-opacity group-hover:opacity-100" />
        </a>
      </div>
      <span className="ml-4 flex-shrink-0 text-xs text-[var(--on-surface-variant)]">
        {caseItem.resolvedAt ?? "Pending"}
      </span>
    </div>
  );
}
