"use client";

import {
  FileText,
  LayoutPanelTop,
  Search,
  ShieldAlert,
  Users,
} from "lucide-react";

const topbarConfig = {
  title: "Global Feed",
  symbol: "#",
  searchPlaceholder: "Search message history...",
  tabs: ["Threads"],
  activeTab: "Threads",
};

type TopbarProps = {
  searchQuery: string;
  onSearchChange: (value: string) => void;
};

export default function Topbar({
  searchQuery,
  onSearchChange,
}: TopbarProps) {
  const scrollToRightRailSection = (sectionId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  return (
    <header className="flex h-16 items-center justify-between bg-[color:color-mix(in_srgb,var(--background)_60%,transparent)] px-6 backdrop-blur-xl">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-[var(--secondary)]">
            {topbarConfig.symbol}
          </span>
          <h1 className="font-headline text-lg font-semibold text-[var(--on-surface)]">
            {topbarConfig.title}
          </h1>
        </div>

        <div className="hidden items-center gap-6 md:flex">
          {topbarConfig.tabs.map((tab) => (
            <button
              key={tab}
              className={[
                "pb-1 text-sm font-medium transition-colors",
                tab === topbarConfig.activeTab
                  ? "border-b-2 border-[var(--primary)] text-[var(--primary)]"
                  : "text-[var(--on-surface-variant)] hover:text-[var(--on-surface)]",
              ].join(" ")}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--on-surface-variant)]" />
          <input
            type="text"
            placeholder={topbarConfig.searchPlaceholder}
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            className="w-64 rounded-full bg-[var(--surface-container-lowest)] py-2 pl-9 pr-4 text-xs text-[var(--on-surface)] outline-none placeholder:text-[color:color-mix(in_srgb,var(--on-surface-variant)_50%,transparent)]"
          />
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => scrollToRightRailSection("room-about")}
            className="rounded-md p-2 text-[var(--primary)] transition-colors hover:bg-white/5"
            aria-label="Scroll to room about"
            title="About"
          >
            <FileText className="h-4 w-4" />
          </button>
          <button
            onClick={() => scrollToRightRailSection("room-participants")}
            className="rounded-md p-2 text-[var(--primary)] transition-colors hover:bg-white/5"
            aria-label="Scroll to participants"
            title="Participants"
          >
            <Users className="h-4 w-4" />
          </button>
          <button
            onClick={() => scrollToRightRailSection("room-previous-cases")}
            className="rounded-md p-2 text-[var(--primary)] transition-colors hover:bg-white/5"
            aria-label="Scroll to previous cases"
            title="Previous Cases"
          >
            <ShieldAlert className="h-4 w-4" />
          </button>
          <button
            onClick={() => scrollToRightRailSection("room-details-top")}
            className="rounded-md p-2 text-[var(--primary)] transition-colors hover:bg-white/5"
            aria-label="Scroll to top of room details"
            title="Room Details"
          >
            <LayoutPanelTop className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
