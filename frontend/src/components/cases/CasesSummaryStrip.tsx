type CasesSummaryStripProps = {
  assigned: number;
  resolved: number;
};

const summaryItems = (counts: CasesSummaryStripProps) => [
  { label: "Assigned to Me", value: counts.assigned, tone: "text-[var(--primary)]" },
  { label: "Resolved", value: counts.resolved, tone: "text-[var(--on-surface)]" },
];

export default function CasesSummaryStrip(props: CasesSummaryStripProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {summaryItems(props).map((item) => (
        <div
          key={item.label}
          className="rounded-3xl bg-[var(--surface-container)] p-4 shadow-sm"
        >
          <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--on-surface-variant)]">
            {item.label}
          </p>
          <p className={["font-headline text-2xl font-black", item.tone].join(" ")}>
            {String(item.value).padStart(2, "0")}
          </p>
        </div>
      ))}
    </div>
  );
}
