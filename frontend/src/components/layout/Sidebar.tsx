"use client";

import {
  Gavel,
  HelpCircle,
  Home,
  Settings,
  Shield,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import ProfileLogo from "@/components/ui/ProfileLogo";
import { getPunishmentExpiry, isActivePunishment } from "@/lib/punishment";
import type { UserPunishment } from "@/types/database/userPunishment";
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
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("Loading...");
  const [userInitials, setUserInitials] = useState<string>("");
  const [activePunishment, setActivePunishment] = useState<UserPunishment | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [assignedCaseCount, setAssignedCaseCount] = useState(0);
  const hasForcedSignOut = useRef(false);

  const activePunishmentExpiry = activePunishment ? getPunishmentExpiry(activePunishment) : null;
  const isPunished =
    Boolean(activePunishment) &&
    (!activePunishmentExpiry || activePunishmentExpiry.getTime() > Date.now());
  const userStatusText = activePunishment
    ? activePunishment.punishment_type === "timeout" && activePunishmentExpiry
      ? `Timed out until ${activePunishmentExpiry.toLocaleDateString([], {
          month: "short",
          day: "numeric",
        })}`
      : `Punishment active: ${activePunishment.punishment_type}`
    : "Available";

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserId(session.user.id);

        const { data: profile } = await supabase.from('profiles').select('username').eq('id', session.user.id).single();
        const name = profile?.username || session.user.email || "Sentinel";
        setUserName(name);
        setUserInitials(name.substring(0, 1).toUpperCase());

        const { data: walletProfile } = await supabase
          .from("profiles")
          .select("wallet_address")
          .eq("id", session.user.id)
          .single();

        setWalletAddress(walletProfile?.wallet_address?.toLowerCase() ?? null);

      const { data: punishment } = await supabase
        .from("user_punishments")
        .select("punishment_type, duration, issued_at, expires_at, is_active")
          .eq("user_id", session.user.id)
          .eq("is_active", true)
          .order("issued_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        setActivePunishment(
          punishment?.is_active && isActivePunishment(punishment as UserPunishment)
            ? (punishment as UserPunishment)
            : null,
        );
      }
    };
    fetchUser();
  }, [supabase]);

  useEffect(() => {
    if (!activePunishmentExpiry) return;

    const msUntilExpiry = activePunishmentExpiry.getTime() - Date.now();
    const timeout = window.setTimeout(() => {
      setActivePunishment(null);
    }, Math.max(0, msUntilExpiry) + 250);

    return () => window.clearTimeout(timeout);
  }, [activePunishmentExpiry]);

  useEffect(() => {
    let isMounted = true;

    const forceSignOutIfNeeded = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || hasForcedSignOut.current || !isMounted) return;

      const { data: punishment } = await supabase
        .from("user_punishments")
        .select("punishment_type, is_active, expires_at, issued_at, duration")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("issued_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!punishment?.is_active) {
        setActivePunishment(null);
        return;
      }

      const typedPunishment = punishment as UserPunishment;
      const punishmentType = String(punishment.punishment_type || "").toLowerCase();
      const expiresAt = getPunishmentExpiry(typedPunishment);
      const isStillActive = !expiresAt || expiresAt.getTime() > Date.now();

      if (!isStillActive) {
        setActivePunishment(null);
        return;
      }

      setActivePunishment(typedPunishment);

      if (punishmentType === "kick" || punishmentType === "ban") {
        hasForcedSignOut.current = true;
        await supabase.auth.signOut();
        router.replace(
          `/login?message=${encodeURIComponent(
            `Signed out due to active ${punishmentType} punishment.`,
          )}`,
        );
      }
    };

    void forceSignOutIfNeeded();

    const interval = window.setInterval(() => {
      void forceSignOutIfNeeded();
    }, 5000);

    const channel = supabase
      .channel("sidebar-punishment-enforcement")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_punishments" },
        () => {
          void forceSignOutIfNeeded();
        },
      )
          .subscribe();

    return () => {
      isMounted = false;
      window.clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [router, supabase, userId, walletAddress]);

  useEffect(() => {
    if (!activePunishmentExpiry) return;

    const msUntilExpiry = activePunishmentExpiry.getTime() - Date.now();
    const timeout = window.setTimeout(() => {
      setActivePunishment(null);
    }, Math.max(0, msUntilExpiry) + 250);

    return () => window.clearTimeout(timeout);
  }, [activePunishmentExpiry]);

  useEffect(() => {
    if (!walletAddress) return;

    const loadAssignedCases = async () => {
      const { data, error } = await supabase
        .from("moderation_cases")
        .select("id, status")
        .or(
          `moderator_1.eq.${walletAddress},moderator_2.eq.${walletAddress},moderator_3.eq.${walletAddress}`,
        )
        .neq("status", "resolved");

      if (error) {
        console.error("Error loading assigned moderation cases:", error);
        return;
      }

      setAssignedCaseCount(data?.length ?? 0);
    };

    void loadAssignedCases();

    const channel = supabase
      .channel(`sidebar-moderation-cases-${walletAddress}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "moderation_cases" },
        () => {
          void loadAssignedCases();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, walletAddress]);

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
          const isCasesItem = item.label === "Cases";
          const hasCaseAlerts = isCasesItem && assignedCaseCount > 0;

          return (
            <Link
              key={item.label}
              href={item.href}
              className={[
                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                isActive
                  ? "bg-[var(--surface-container-high)] text-[var(--primary)]"
                  : hasCaseAlerts
                    ? "text-[#ffb4ab] hover:bg-[color:color-mix(in_srgb,var(--error)_12%,var(--surface-container-highest))] hover:text-white"
                    : "text-[var(--on-surface-variant)] hover:bg-[var(--surface-container-highest)] hover:text-[var(--on-surface)]",
              ].join(" ")}
            >
              <Icon className="h-4 w-4" />
              <span className="font-medium">{item.label}</span>
              {hasCaseAlerts && (
                <span className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-[#dc2626] px-1.5 py-0.5 text-[10px] font-bold leading-none text-white shadow-[0_4px_10px_rgba(127,29,29,0.28)]">
                  {assignedCaseCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-4 pt-4">
        <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[var(--on-surface-variant)] transition-colors hover:bg-[var(--surface-container-highest)] hover:text-[var(--on-surface)]">
          <HelpCircle className="h-4 w-4" />
          <span className="font-medium">Help</span>
        </button>

        <div
          className={[
            "mt-4 rounded-xl p-3 transition-colors cursor-pointer",
            isPunished
              ? "bg-[color:color-mix(in_srgb,var(--error)_14%,var(--surface-container-high))] hover:bg-[color:color-mix(in_srgb,var(--error)_18%,var(--surface-container-highest))]"
              : "bg-[var(--surface-container-high)] hover:bg-[var(--surface-container-highest)]",
          ].join(" ")}
        >
          <div className="flex items-center gap-3">
            <ProfileLogo
              name={userName}
              initials={userInitials}
              className="h-10 w-10 rounded-lg object-cover"
              fallbackClassName="flex h-10 w-10 items-center justify-center rounded-lg bg-[color:color-mix(in_srgb,var(--primary)_18%,transparent)] text-sm font-bold text-[var(--primary)]"
            />

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[var(--on-surface)]">
                {userName}
              </p>
              <p
                className={[
                  "truncate text-xs",
                  isPunished ? "text-[#ffb4ab]" : "text-[var(--on-surface-variant)]",
                ].join(" ")}
              >
                {userStatusText}
              </p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
