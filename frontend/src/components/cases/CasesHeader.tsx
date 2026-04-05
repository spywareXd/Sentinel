"use client";

type CasesHeaderProps = {
  activeTopTab: "Assigned" | "History";
  onTopTabChange: (tab: "Assigned" | "History") => void;
};

const topTabs: Array<"Assigned" | "History"> = ["Assigned", "History"];

export default function CasesHeader({
  activeTopTab,
  onTopTabChange,
}: CasesHeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center bg-[color:color-mix(in_srgb,var(--background)_80%,transparent)] px-8 backdrop-blur-xl">
      <div className="flex items-center gap-8">
        <h2 className="font-headline text-lg font-black uppercase tracking-tight text-[var(--on-surface)]">
          Moderation Queue
        </h2>

        <nav className="hidden items-center gap-6 md:flex">
          {topTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => onTopTabChange(tab)}
              className={[
                "pb-1 text-sm font-semibold uppercase tracking-tight transition-colors",
                tab === activeTopTab
                  ? "border-b-2 border-[var(--primary-container)] text-[var(--primary)]"
                  : "text-[var(--on-surface-variant)] hover:text-[var(--on-surface)]",
              ].join(" ")}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}
