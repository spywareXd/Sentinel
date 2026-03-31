"use client";

import { FileText, LayoutPanelTop, ShieldAlert, Users } from "lucide-react";

type CasesHeaderProps = {
  activeTopTab: "Assigned" | "History";
  onTopTabChange: (tab: "Assigned" | "History") => void;
};

const topTabs: Array<"Assigned" | "History"> = ["Assigned", "History"];

export default function CasesHeader({
  activeTopTab,
  onTopTabChange,
}: CasesHeaderProps) {
  const scrollToRightRailSection = (sectionId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between bg-[color:color-mix(in_srgb,var(--background)_80%,transparent)] px-8 backdrop-blur-xl">
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

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <button
            onClick={() => scrollToRightRailSection("cases-about")}
            className="rounded-lg p-2 text-[var(--primary)] transition-colors hover:bg-white/5"
            title="About Cases"
          >
            <FileText className="h-4 w-4" />
          </button>
          <button
            onClick={() => scrollToRightRailSection("cases-jurors")}
            className="rounded-lg p-2 text-[var(--primary)] transition-colors hover:bg-white/5"
            title="Assigned Jurors"
          >
            <Users className="h-4 w-4" />
          </button>
          <button
            onClick={() => scrollToRightRailSection("cases-proof")}
            className="rounded-lg p-2 text-[var(--primary)] transition-colors hover:bg-white/5"
            title="Oversight Proof"
          >
            <ShieldAlert className="h-4 w-4" />
          </button>
          <button
            onClick={() => scrollToRightRailSection("cases-details-top")}
            className="rounded-lg p-2 text-[var(--primary)] transition-colors hover:bg-white/5"
            title="Case Details"
          >
            <LayoutPanelTop className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
