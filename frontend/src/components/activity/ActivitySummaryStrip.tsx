type ActivitySummaryStripProps = {
  total: number;
  active: number;
  bans: number;
  timeouts: number;
};

const summaryItems = (counts: ActivitySummaryStripProps) => [
  { label: "Total Records", value: counts.total, tone: "text-[var(--on-surface)]" },
  { label: "Active", value: counts.active, tone: "text-[var(--primary)]" },
  { label: "Bans", value: counts.bans, tone: "text-[var(--error)]" },
  { label: "Timeouts", value: counts.timeouts, tone: "text-[var(--secondary)]" },
];

export default function ActivitySummaryStrip(props: ActivitySummaryStripProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
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
