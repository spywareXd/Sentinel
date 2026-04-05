# Sentinel Platform — Complete Frontend & Auth Replication Guide

> **Purpose**: This document contains every detail needed to recreate the Sentinel frontend's authentication system, session management, route protection, logout flow, and key UI features from scratch. It includes the exact code for each file, the reasoning behind every decision, and best practices followed.

---

## Table of Contents
1. [Prerequisites & Stack](#1-prerequisites--stack)
2. [Step 1 — Supabase Client Utilities](#2-step-1--supabase-client-utilities)
3. [Step 2 — Server-Side Middleware & Route Protection](#3-step-2--server-side-middleware--route-protection)
4. [Step 3 — Global Auth Provider (Session Store)](#4-step-3--global-auth-provider-session-store)
5. [Step 4 — useAuth Hook](#5-step-4--useauth-hook)
6. [Step 5 — Root Layout (Provider Wrapping)](#6-step-5--root-layout-provider-wrapping)
7. [Step 6 — Server Actions (Login, Logout, Signup)](#7-step-6--server-actions-login-logout-signup)
8. [Step 7 — Login Page UI](#8-step-7--login-page-ui)
9. [Step 8 — Sidebar (Profile Display & Logout Button)](#9-step-8--sidebar-profile-display--logout-button)
10. [Step 9 — Chat Page (Security Handshake Loading Screen)](#10-step-9--chat-page-security-handshake-loading-screen)
11. [Step 10 — Landing Page (Glassmorphism Navbar & Shield Mascot)](#11-step-10--landing-page-glassmorphism-navbar--shield-mascot)
12. [Architecture Diagram](#12-architecture-diagram)
13. [Common Pitfalls & Best Practices](#13-common-pitfalls--best-practices)

---

## 1. Prerequisites & Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16+ (App Router, Server Actions) |
| Auth/BaaS | Supabase + `@supabase/ssr` |
| Styling | Tailwind CSS |
| Icons | Lucide React + Google Material Symbols |
| Fonts | Inter (body), Manrope (headlines) via `next/font/google` |
| Design System | "Obsidian Nexus" — dark-mode-first, glassmorphism, tonal surface shifts |

**Required packages:**
```bash
npm install @supabase/supabase-js @supabase/ssr lucide-react
```

**Required environment variables (`.env`):**
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=eyJ...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Database requirement:** A `profiles` table in Supabase with columns: `id` (uuid, FK to `auth.users`), `username` (text), `email` (text), `wallet_address` (text). Typically populated via a database trigger on `auth.users` insert.

---

## 2. Step 1 — Supabase Client Utilities

Three separate Supabase clients are required to handle cookies correctly across Next.js environments. This follows the official `@supabase/ssr` best practices.

### `src/utils/supabase/client.ts` — Browser Client
Used in `"use client"` components. Stores tokens in browser storage automatically.

```ts
import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

export const createClient = () =>
  createBrowserClient(
    supabaseUrl ?? "",
    supabaseKey ?? "",
  );
```

### `src/utils/supabase/server.ts` — Server Client
Used in Server Actions and Server Components. Reads/writes HTTP-only cookies via `next/headers`.

```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    supabaseUrl ?? "",
    supabaseKey ?? "",
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}
```

> **Best Practice**: The `try/catch` in `setAll` is intentional. Server Components cannot set cookies, but Server Actions can. The middleware handles the refresh case.

---

## 3. Step 2 — Server-Side Middleware & Route Protection

### `src/utils/supabase/middleware.ts` — The Core Engine
This is the heart of the auth system. It runs on every request before the page renders.

**What it does:**
1. Creates a Supabase client that can read/write request cookies
2. Calls `supabase.auth.getUser()` to refresh and validate the session
3. Enforces route protection rules (forward and reverse)
4. Passes refreshed cookies to the response

```ts
import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    supabaseUrl!,
    supabaseKey!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh the session — IMPORTANT: do not add logic between
  // createServerClient and supabase.auth.getUser()
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const authRoutes = ["/login", "/register", "/forgot-password"];
  const publicRoutes = ["/", "/auth"];

  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));

  // REVERSE PROTECTION: Logged-in users cannot access auth pages
  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/chat";
    return NextResponse.redirect(url);
  }

  // FORWARD PROTECTION: Guests cannot access app routes
  const protectedPaths = ["/chat", "/cases", "/profile", "/settings"];
  const isProtectedPath = protectedPaths.some((path) => pathname.startsWith(path));

  if (!user && isProtectedPath && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
```

### `middleware.ts` (root of frontend) — Thin Wrapper
The outer middleware file is minimal. All logic lives in `updateSession`.

```ts
import { type NextRequest } from "next/server";
import { updateSession } from "./src/utils/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

> **Best Practice**: The `matcher` excludes static assets from middleware processing for performance.

---

## 4. Step 3 — Global Auth Provider (Session Store)

### `src/components/providers/auth-provider.tsx`

This is the centralized session store. It wraps the entire app and provides `user`, `session`, `isLoading`, `signOut`, and `refreshSession` to all child components.

```tsx
"use client";

import { createContext, useEffect, useState, ReactNode } from "react";
import { createClient } from "@/utils/supabase/client";
import { Session, User } from "@supabase/supabase-js";

type AuthContextType = {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [supabase] = useState(() => createClient());

  const refreshSession = async () => {
    setIsLoading(true);
    try {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
    } catch (error) {
      console.error("Error refreshing session:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider value={{ session, user, isLoading, signOut, refreshSession }}>
      {children}
    </AuthContext.Provider>
  );
}
```

**Key design decisions:**
- `refreshSession` is exposed publicly so the login page can force a client-side sync after a server action completes (solving the "loading..." bug on first login).
- `signOut` uses `window.location.href` instead of `router.push` to ensure the Next.js router cache is fully purged.
- `onAuthStateChange` provides real-time updates for token refreshes and session expiry.

---

## 5. Step 4 — useAuth Hook

### `src/hooks/use-auth.ts`

```ts
"use client";

import { useContext } from "react";
import { AuthContext } from "@/components/providers/auth-provider";

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
```

> **Best Practice**: Throwing an error if used outside the provider catches configuration mistakes early during development.

---

## 6. Step 5 — Root Layout (Provider Wrapping)

### `src/app/layout.tsx`

The `AuthProvider` wraps the entire app at the root layout level. `suppressHydrationWarning` is added to `<html>` to prevent hydration mismatches caused by browser extensions injecting attributes.

```tsx
import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

const manrope = Manrope({
  variable: "--font-headline",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "SentinelDAO",
  description: "Decentralized content moderation platform",
};

import { AuthProvider } from "@/components/providers/auth-provider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${manrope.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col bg-[var(--background)] text-[var(--on-surface)] font-[var(--font-body)]">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
```

---

## 7. Step 6 — Server Actions (Login, Logout, Signup)

### `src/app/actions/auth.ts`

All auth mutations happen server-side via Next.js Server Actions. This ensures credentials never touch the browser and cookies are set securely.

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const identifier = formData.get('identifier') as string
  const password = formData.get('password') as string

  // Determine if the identifier is an email or a username
  let email = identifier

  if (!identifier.includes('@')) {
    // It's a username — look up the associated email from profiles
    const { data: profile, error: lookupError } = await supabase
      .from('profiles')
      .select('email')
      .eq('username', identifier)
      .single()

    if (lookupError || !profile?.email) {
      return { error: 'No account found with that username.' }
    }

    email = profile.email
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  return { success: true }
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    username: formData.get('username') as string,
    walletAddress: formData.get('walletAddress') as string,
  }

  const { error } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      emailRedirectTo: `${appUrl}/auth/callback`,
      data: {
        username: data.username,
        wallet_address: data.walletAddress,
      },
    },
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/login?message=Check your email to confirm your account')
}

export async function resetPassword(formData: FormData) {
  const supabase = await createClient()
  const email = formData.get('email') as string

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${appUrl}/auth/callback?next=/auth/update-password`,
  })

  if (error) {
    return { error: error.message }
  }

  redirect('/login?message=Password reset link sent to your email')
}
```

**Key design decisions:**
- `login()` returns `{ success: true }` instead of calling `redirect()` so the client can call `refreshSession()` before navigating. This is the fix for the sidebar "Loading..." bug.
- `logout()` uses `redirect()` directly since no client-side sync is needed.
- `signup()` passes `user_metadata` so a Supabase database trigger can populate the `profiles` table automatically.

---

## 8. Step 7 — Login Page UI

### `src/app/login/page.tsx`

The login page uses `useSearchParams` (wrapped in `<Suspense>`) and calls `refreshSession()` after a successful server login to sync the client context.

**Critical flow:**
1. User submits form → `login()` server action runs → cookies are set server-side
2. `await refreshSession()` forces the client's `AuthProvider` to read the new cookies
3. `router.replace(redirectTo)` navigates to the intended destination

The Sentinel shield logo at the top is wrapped in `<Link href="/">` so users can navigate back to the landing page.

```tsx
'use client';

export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Shield, QrCode, UserRound, Wallet } from 'lucide-react';
import { login } from '@/app/actions/auth';
import { useAuth } from '@/hooks/use-auth';

function LoginContent() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshSession } = useAuth();

  const message = searchParams.get('message');
  const redirectTo = searchParams.get('redirectTo') || '/chat';

  const handleSubmit = async (formData: FormData) => {
    setLoading(true);
    setError(null);

    const result = await login(formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    // CRITICAL: Sync the client-side AuthProvider with the
    // newly-set server cookies BEFORE navigating away.
    await refreshSession();
    router.replace(redirectTo);
  };

  return ( /* form JSX — see full file for UI details */ );
}

export default function Login() {
  return (
    <div className="...">
      <div className="...">
        {/* Logo — clickable, routes back to landing page */}
        <Link href="/" className="mb-8 flex flex-col items-center transition-transform hover:scale-105">
          <div className="mb-4 rounded-[1.2rem] bg-[#a3a5fa] p-3 text-[#0a0c14] shadow-[0_0_30px_rgba(163,165,250,0.2)]">
            <Shield className="h-8 w-8" strokeWidth={2.5} />
          </div>
          <h1 className="font-headline text-xl font-bold uppercase tracking-[0.25em] text-on-surface">Sentinel</h1>
        </Link>

        <div className="w-full rounded-3xl border border-white/[0.02] bg-surface-container/90 p-8 shadow-2xl backdrop-blur-md">
          <Suspense fallback={null}>
            <LoginContent />
          </Suspense>
          {/* MetaMask button, register link, etc. */}
        </div>
      </div>
    </div>
  );
}
```

---

## 9. Step 8 — Sidebar (Profile Display & Logout Button)

### `src/components/layout/Sidebar.tsx`

The sidebar displays the authenticated user's name, initials, and a logout button. It uses `useAuth()` to get the global auth state and fetches the profile from the database.

**Username resolution priority:**
1. `profiles.username` from database
2. `user.user_metadata.username` from Supabase auth metadata
3. `user.email` split at `@`
4. Hardcoded `"Sentinel"` fallback

**Logout behavior:**
- Calls `signOut()` from the auth context
- `signOut()` calls `supabase.auth.signOut()` to destroy the session
- Clears local state (`setSession(null)`, `setUser(null)`)
- Uses `window.location.href = "/login"` (NOT `router.push`) to fully clear Next.js router cache

```tsx
// Key parts of Sidebar.tsx:

const { user, isLoading: isAuthLoading, signOut } = useAuth();

// Profile fetching effect — only runs after auth resolves
useEffect(() => {
  const fetchProfile = async () => {
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .single();

      const metadataName = typeof user.user_metadata?.username === "string"
        ? user.user_metadata.username : null;
      const name = profile?.username || metadataName || user.email?.split("@")[0] || "Sentinel";
      setUserName(name);
      setUserInitials(name.substring(0, 1).toUpperCase());
    }
  };
  if (!isAuthLoading) { fetchProfile(); }
}, [user, isAuthLoading, supabase]);

// Display logic
const displayUserName = isAuthLoading ? "Loading..." : userName;

// Logout button JSX
<button onClick={() => signOut()} className="... hover:bg-red-500/10 hover:text-red-400">
  <LogOut className="h-4 w-4" />
  <span className="font-medium">Log out</span>
</button>
```

---

## 10. Step 9 — Chat Page (Security Handshake Loading Screen)

### `src/app/chat/page.tsx`

Protected pages must prevent any UI flicker before auth is verified. The chat page defaults to `loading = true` and shows a branded "Security Handshake" screen instead of the actual interface.

**Flow:**
1. Page mounts with `loading = true`
2. `supabase.auth.getUser()` is called
3. If no user → redirect to `/login`
4. If user exists → fetch profile, load messages, set `loading = false`

```tsx
const [loading, setLoading] = useState(true);

useEffect(() => {
  const getUser = async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      router.push("/login");
      return;
    }
    // ... fetch profile and messages ...
    setLoading(false);
  };
  getUser();
}, [router, supabase]);

if (loading) {
  return (
    <div className="h-screen bg-[#05070a] flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background Aura */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative group perspective">
        <div className="p-1.5 rounded-[2.5rem] bg-white/[0.03] border border-white/[0.05] shadow-2xl relative">
          <div className="bg-[#a3a5fa] text-[#0a0c14] p-6 rounded-[2.1rem] shadow-[0_0_50px_rgba(163,165,250,0.3)] animate-pulse">
            <Shield className="w-16 h-16" strokeWidth={2.5} />
          </div>
        </div>
      </div>

      <div className="mt-16 flex flex-col items-center gap-3">
        <p className="text-on-surface font-headline font-bold tracking-[0.4em] text-xs uppercase">
          Establishing Security Handshake
        </p>
        <div className="flex gap-1.5 items-center justify-center">
          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" />
        </div>
      </div>
    </div>
  );
}

// Actual chat UI renders only after loading = false
return (
  <div className="flex h-screen overflow-hidden bg-[var(--background)]">
    <Sidebar />
    <main>...</main>
  </div>
);
```

---

## 11. Step 10 — Landing Page (Glassmorphism Navbar & Shield Mascot)

### `src/app/page.tsx`

#### Glassmorphism Navbar
The navbar is fixed, translucent, and uses heavy blur + saturation for a premium glass effect:

```tsx
<nav className="fixed top-0 w-full z-50 bg-[#020305]/40 backdrop-blur-2xl backdrop-saturate-[180%] border-b border-white/[0.05] shadow-2xl">
```

- `bg-[#020305]/40` — 40% opacity dark background (lets content bleed through)
- `backdrop-blur-2xl` — maximum blur for glass effect
- `backdrop-saturate-[180%]` — pumps color vibrancy of anything behind the bar
- `border-white/[0.05]` — subtle specular edge

#### Shield Mascot (Hero Emblem)
The shield uses Google Material Symbols with `FILL: 1` (solid fill). The icon size is controlled via **inline styles** because Tailwind's `text-*` classes don't reliably control Material Symbol font sizes.

```tsx
<div className="relative mb-12 drop-shadow-[0_0_40px_rgba(163,165,250,0.4)] group cursor-pointer hover:scale-105 transition-all duration-700">
  {/* Container — fixed dimensions, doesn't scale with icon */}
  <div className="w-56 h-56 md:w-60 md:h-60 rounded-[2.5rem] bg-surface-container-high border border-outline-variant/30 flex items-center justify-center backdrop-blur-xl bg-[rgba(45,52,73,0.4)] rotate-12 group-hover:rotate-[8deg] transition-all duration-700 shadow-2xl relative overflow-visible">
    <div className="w-full h-full flex items-center justify-center -rotate-12 group-hover:-rotate-[8deg] transition-all duration-700">
      <span
        className="material-symbols-outlined block leading-none select-none text-primary group-hover:text-primary-container group-hover:drop-shadow-[0_0_50px_rgba(163,165,250,0.9)] transition-all duration-500"
        style={{
          fontVariationSettings: "'FILL' 1",
          fontSize: 'clamp(120px, 30vw, 120px)',
          lineHeight: '1'
        }}
      >
        shield_with_heart
      </span>
    </div>
  </div>

  {/* Energy Orbits — positioned absolutely behind the shield */}
  <div className="absolute inset-0 border-2 border-secondary/30 rounded-full scale-125 animate-pulse group-hover:scale-[1.15] group-hover:border-secondary/70 transition-all duration-700" />
  <div className="absolute inset-0 border-[1px] border-primary/20 rounded-full scale-150 opacity-30 group-hover:scale-125 group-hover:border-primary/50 group-hover:opacity-100 transition-all duration-700" />
  <div className="absolute inset-0 border border-tertiary/20 rounded-full scale-[1.75] opacity-0 group-hover:animate-spin group-hover:opacity-30 transition-all duration-1000 border-dashed" />
</div>
```

**How to adjust the shield size:**
- Change `fontSize` in the `style` prop (e.g., `'clamp(120px, 30vw, 180px)'` for a bigger icon)
- Change container dimensions (`w-56 h-56 md:w-60 md:h-60`) if the icon needs more room
- The container has `overflow-visible` so glow effects bleed outside naturally

---

## 12. Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    BROWSER REQUEST                       │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│              middleware.ts (root)                         │
│  → calls updateSession(request)                          │
│                                                          │
│  ┌─────────────────────────────────────────────────┐     │
│  │  src/utils/supabase/middleware.ts                │     │
│  │                                                  │     │
│  │  1. Create server client with cookie handlers    │     │
│  │  2. supabase.auth.getUser() → refresh tokens     │     │
│  │  3. Route matching:                               │     │
│  │     • /chat, /cases → needs auth → redirect       │     │
│  │     • /login + logged in → redirect to /chat      │     │
│  │  4. Return response with refreshed cookies        │     │
│  └─────────────────────────────────────────────────┘     │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│                  layout.tsx (root)                        │
│                                                          │
│  <AuthProvider>   ← wraps entire app                     │
│    {children}     ← page content                         │
│  </AuthProvider>                                         │
│                                                          │
│  AuthProvider:                                           │
│    • refreshSession() on mount                           │
│    • onAuthStateChange listener                          │
│    • Exposes: user, session, isLoading,                  │
│               signOut, refreshSession                    │
└──────────────────────┬──────────────────────────────────┘
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
    ┌──────────┐ ┌──────────┐ ┌──────────┐
    │ /login   │ │ /chat    │ │ /        │
    │          │ │          │ │ Landing  │
    │ Calls    │ │ Shows    │ │ Public   │
    │ login()  │ │ loading  │ │ page     │
    │ server   │ │ screen   │ │          │
    │ action   │ │ until    │ │          │
    │ then     │ │ auth is  │ │          │
    │ refresh  │ │ verified │ │          │
    │ Session  │ │          │ │          │
    └──────────┘ └──────────┘ └──────────┘
```

---

## 13. Common Pitfalls & Best Practices

| Pitfall | Solution |
|---|---|
| Sidebar shows "Loading..." after login | Call `await refreshSession()` in the login handler BEFORE `router.replace()` |
| Chat page flickers with unauthorized content | Default to `loading = true`, only render UI after `getUser()` succeeds |
| Logout doesn't clear cached pages | Use `window.location.href` instead of `router.push` to bust the Next.js router cache |
| Browser extension causes hydration mismatch | Add `suppressHydrationWarning` to the `<html>` tag |
| Material icon ignores Tailwind text-size classes | Use inline `style={{ fontSize: '...' }}` instead |
| Middleware doesn't protect new routes | Add the path to the `protectedPaths` array in `updateSession()` |
| `useSearchParams` causes SSR errors | Wrap the component using it in `<Suspense fallback={null}>` |
| Server Action login returns but client doesn't detect session | `login()` returns `{ success: true }` instead of calling `redirect()`, allowing the client to call `refreshSession()` first |
