import CaseActions from "@/components/cases/detail/CaseActions";
import CaseDetailHeader from "@/components/cases/detail/CaseDetailHeader";
import CaseFlaggedMessageCard from "@/components/cases/detail/CaseFlaggedMessageCard";
import CaseInsightSection from "@/components/cases/detail/CaseInsightSection";
import CaseNotesList from "@/components/cases/detail/CaseNotesList";
import CaseProofCard from "@/components/cases/detail/CaseProofCard";
import CaseVoteProgress from "@/components/cases/detail/CaseVoteProgress";
import type { CaseRecord } from "@/types/mockdata/cases";

type CaseDetailPanelProps = {
  caseItem: CaseRecord;
  onDismiss: () => void;
  onPunish: () => void;
};

export default function CaseDetailPanel({
  caseItem,
  onDismiss,
  onPunish,
}: CaseDetailPanelProps) {
  return (
    <aside
      id="cases-details-top"
      className="sticky top-24 flex h-[calc(100vh-8rem)] flex-col gap-6 rounded-[1.75rem] border border-[color:color-mix(in_srgb,var(--outline-variant)_25%,transparent)] bg-[color:color-mix(in_srgb,var(--surface-container-highest)_45%,transparent)] p-6 backdrop-blur-xl"
    >
      <CaseDetailHeader caseItem={caseItem} />

      <div className="premium-scrollbar flex-1 space-y-6 overflow-y-auto pr-2">
        <CaseFlaggedMessageCard caseItem={caseItem} />
        <CaseInsightSection caseItem={caseItem} />
        <CaseVoteProgress caseItem={caseItem} />
        <CaseProofCard caseItem={caseItem} />
        <CaseNotesList notes={caseItem.notes} />
      </div>

      <CaseActions
        isResolved={caseItem.status === "Resolved"}
        decision={caseItem.decision}
        onDismiss={onDismiss}
        onPunish={onPunish}
      />
    </aside>
  );
}
