"use client";

import {
  Gavel,
  HelpCircle,
  Home,
  LogOut,
  Settings,
  Shield,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import ProfileLogo from "@/components/ui/ProfileLogo";
import { useAuth } from "@/hooks/use-auth";
import { createClient } from "@/utils/supabase/client";

const sidebarBrand = {
  name: "SentinelDAO",
  tagline: "Community Layer",
  ctaLabel: "New Thread",
};

const navItems = [
  { label: "Feed", icon: "home", href: "/chat" },
  { label: "Cases", icon: "shield", href: "/cases" },
  { label: "Activity", icon: "gavel", href: "#" },
  { label: "Settings", icon: "settings", href: "#" },
] as const;

const iconMap = {
  home: Home,
  shield: Shield,
  gavel: Gavel,
  sparkles: Sparkles,
  settings: Settings,
} as const;

export default function Sidebar() {
  const pathname = usePathname();
  const { user, isLoading: isAuthLoading, signOut } = useAuth();
  const supabase = createClient();
  const [userName, setUserName] = useState<string>("Sentinel");
  const [userInitials, setUserInitials] = useState<string>("S");

  useEffect(() => {
    const fetchProfile = async () => {
      if (user) {
        console.log("Fetching profile for user:", user.id);
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", user.id)
          .single();
        
        if (error) {
          console.error("Error fetching profile:", error);
        }

        const name = profile?.username || user.email?.split('@')[0] || "Sentinel";
        console.log("Setting user name to:", name);
        setUserName(name);
        setUserInitials(name.substring(0, 1).toUpperCase());
      }
    };

    if (!isAuthLoading) {
      fetchProfile();
    }
  }, [user, isAuthLoading, supabase]);

  // Optionally show a different state while auth is loading
  const displayUserName = isAuthLoading ? "Loading..." : userName;
  const displayUserInitials = isAuthLoading ? "..." : userInitials;

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col bg-[var(--surface-container-low)] px-4 py-4 text-[var(--on-surface)]">
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
          const isActive = item.href !== "#" && pathname === item.href;

          return (
            <Link
              key={item.label}
              href={item.href}
              className={[
                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                isActive
                  ? "bg-[var(--surface-container-high)] text-[var(--primary)]"
                  : "text-[var(--on-surface-variant)] hover:bg-[var(--surface-container-highest)] hover:text-[var(--on-surface)]",
              ].join(" ")}
            >
              <Icon className="h-4 w-4" />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-4 pt-4 border-t border-[var(--outline-variant)]/20">
        <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[var(--on-surface-variant)] transition-colors hover:bg-[var(--surface-container-highest)] hover:text-[var(--on-surface)]">
          <HelpCircle className="h-4 w-4" />
          <span className="font-medium">Help</span>
        </button>

        <button
          onClick={() => signOut()}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[var(--on-surface-variant)] transition-colors hover:bg-red-500/10 hover:text-red-400"
        >
          <LogOut className="h-4 w-4" />
          <span className="font-medium">Log out</span>
        </button>

        <div className="mt-4 rounded-xl bg-[var(--surface-container-high)] p-3 hover:bg-[var(--surface-container-highest)] transition-colors cursor-pointer">
          <div className="flex items-center gap-3">
            <ProfileLogo
              name={displayUserName}
              initials={displayUserInitials}
              className="h-10 w-10 rounded-lg object-cover"
              fallbackClassName="flex h-10 w-10 items-center justify-center rounded-lg bg-[color:color-mix(in_srgb,var(--primary)_18%,transparent)] text-sm font-bold text-[var(--primary)]"
            />

            <div className="min-w-0 pr-2">
              <p className="truncate text-sm font-semibold text-[var(--on-surface)]">
                {displayUserName}
              </p>
              <p className="truncate text-xs text-[var(--on-surface-variant)]">
                {isAuthLoading ? "Verifying session..." : "Available"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
