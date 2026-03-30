import {
  Gavel,
  HelpCircle,
  Home,
  Layers3,
  Settings,
  Shield,
  Sparkles,
} from "lucide-react";
import ProfileLogo from "@/components/ui/ProfileLogo";
import { currentUser } from "@/mockdata/user";

const sidebarBrand = {
  name: "SentinelDAO",
  tagline: "Community Layer",
  ctaLabel: "New Thread",
};

const navItems = [
  { label: "Feed", icon: "home", active: true },
  { label: "Cases", icon: "shield", active: false },
  { label: "Activity", icon: "gavel", active: false },
  { label: "Settings", icon: "settings", active: false },
] as const;

const iconMap = {
  home: Home,
  shield: Shield,
  gavel: Gavel,
  sparkles: Sparkles,
  layers: Layers3,
  settings: Settings,
} as const;

export default function Sidebar() {
  return (
    <aside className="flex h-screen w-64 flex-col bg-[var(--surface-container)] px-4 py-4 text-[var(--on-surface)]">
      <div className="mb-8 flex items-center gap-3 px-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary-container)] text-[#07006c] shadow-[0_12px_30px_rgba(128,131,255,0.22)]">
          <Shield className="h-5 w-5" />
        </div>

        <div>
          <p className="font-headline text-lg font-bold tracking-tight text-[var(--primary)]">
            {sidebarBrand.name}
          </p>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--on-surface-variant)]">
            {sidebarBrand.tagline}
          </p>
        </div>
      </div>

      <button className="mb-6 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--primary-container)] px-4 py-3 font-headline text-sm font-bold text-[#07006c] transition-opacity hover:opacity-95">
        <Sparkles className="h-4 w-4" />
        {sidebarBrand.ctaLabel}
      </button>

      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const Icon = iconMap[item.icon];

          return (
            <button
              key={item.label}
              className={[
                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                item.active
                  ? "bg-[var(--surface-container-high)] text-[var(--primary)]"
                  : "text-[var(--on-surface-variant)] hover:bg-[var(--surface-container-highest)] hover:text-[var(--on-surface)]",
              ].join(" ")}
            >
              <Icon className="h-4 w-4" />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="mt-4 border-t border-[color:color-mix(in_srgb,var(--outline-variant)_20%,transparent)] pt-4">
        <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[var(--on-surface-variant)] transition-colors hover:bg-[var(--surface-container-highest)] hover:text-[var(--on-surface)]">
          <HelpCircle className="h-4 w-4" />
          <span className="font-medium">Help</span>
        </button>

        <div className="mt-4 rounded-xl bg-[var(--surface-container-high)] p-3">
          <div className="flex items-center gap-3">
            <ProfileLogo
              name={currentUser.name}
              initials={currentUser.initials}
              logoUrl={currentUser.logoUrl}
              className="h-10 w-10 rounded-lg object-cover"
              fallbackClassName="flex h-10 w-10 items-center justify-center rounded-lg bg-[color:color-mix(in_srgb,var(--primary)_18%,transparent)] text-sm font-bold text-[var(--primary)]"
            />

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[var(--on-surface)]">
                {currentUser.name}
              </p>
              <p className="truncate text-xs text-[var(--on-surface-variant)]">
                {currentUser.status}
              </p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
