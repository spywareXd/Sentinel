import Link from "next/link";
import type { CaseRecord } from "@/types/mockdata/cases";

type CaseFlaggedMessageCardProps = {
  caseItem: CaseRecord;
};

export default function CaseFlaggedMessageCard({
  caseItem,
}: CaseFlaggedMessageCardProps) {
  const messageBody = (
    <div className="rounded-xl border-l-2 border-[var(--error)] bg-[var(--surface-container-high)] p-4 transition-colors">
      <p className="text-sm italic leading-7 text-[var(--on-surface)]">
        &quot;{caseItem.flaggedMessage}&quot;
      </p>
    </div>
  );

  return (
    <div
      id="cases-about"
      className="rounded-2xl bg-[var(--surface-container-lowest)] p-4"
    >
      <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--on-surface-variant)]">
        Flagged Message
      </p>
      {caseItem.messageId ? (
        <Link
          href={`/chat?focus=${encodeURIComponent(caseItem.messageId)}`}
          className="group block"
          title="Open this message in the feed"
        >
          <div className="transition-transform duration-150 group-hover:translate-x-0.5">
            {messageBody}
          </div>
        </Link>
      ) : (
        messageBody
      )}
      <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center text-[10px]">
        <span className="text-[var(--on-surface-variant)]">{caseItem.openedAt}</span>
        <div className="justify-self-center">
          {caseItem.messageId && (
            <Link
              href={`/chat?focus=${encodeURIComponent(caseItem.messageId)}`}
              className="text-center font-bold text-[var(--primary)] transition-opacity hover:opacity-80"
            >
              Open In Feed
            </Link>
          )}
        </div>
        <span className="justify-self-end font-bold text-[var(--secondary)]">
          Harmful score {Math.round(caseItem.harmfulScore * 100)}%
        </span>
      </div>
    </div>
  );
}
