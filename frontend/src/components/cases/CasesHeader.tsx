"use client";

import {
  FileText,
  LayoutPanelTop,
  Search,
  ShieldAlert,
  Users,
} from "lucide-react";

type CasesHeaderProps = {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  activeTopTab: "Active" | "Pending" | "Resolved";
  onTopTabChange: (tab: "Active" | "Pending" | "Resolved") => void;
};

const topTabs: Array<"Active" | "Pending" | "Resolved"> = [
  "Active",
  "Pending",
  "Resolved",
];

export default function CasesHeader({
  searchQuery,
  onSearchChange,
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
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--on-surface-variant)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search case id, title, offender..."
            className="w-56 rounded-full bg-[var(--surface-container-lowest)] py-2 pl-10 pr-4 text-xs text-[var(--on-surface)] outline-none transition-all focus:w-72 placeholder:text-[color:color-mix(in_srgb,var(--on-surface-variant)_55%,transparent)]"
          />
        </div>

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
