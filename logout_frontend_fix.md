# Sentinel Frontend — Auth & UI Replication Guide

> Recreate the complete authentication, session management, route protection, logout, and UI system.

## Stack
Next.js 16+ (App Router), Supabase + `@supabase/ssr`, Tailwind CSS, Lucide React, Google Material Symbols, Inter + Manrope fonts.

**Env vars:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`, `NEXT_PUBLIC_APP_URL`
**DB:** `profiles` table with `id` (FK to auth.users), `username`, `email`, `wallet_address`.

---

## 1. Supabase Clients (3 variants)

### `src/utils/supabase/client.ts` — Browser
```ts
import { createBrowserClient } from "@supabase/ssr";
export const createClient = () =>
  createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "", process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ?? "");
```

### `src/utils/supabase/server.ts` — Server Actions
```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "", process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ?? "", {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll(cookiesToSet) {
        try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); }
        catch { /* Ignored in Server Components; middleware handles refresh */ }
      },
    },
  });
}
```

### `src/utils/supabase/middleware.ts` — Route Guard Engine
Creates a server client from request cookies, refreshes the session, then enforces routing rules.

```ts
import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!, {
    cookies: {
      getAll() { return request.cookies.getAll(); },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options));
      },
    },
  });

  // IMPORTANT: no logic between createServerClient and getUser()
  const { data: { user } } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;
  const isAuthRoute = ["/login", "/register", "/forgot-password"].some(r => pathname.startsWith(r));
  const isProtected = ["/chat", "/cases", "/profile", "/settings"].some(r => pathname.startsWith(r));

  // Reverse protection: logged-in users can't access auth pages
  if (user && isAuthRoute) {
    const url = request.nextUrl.clone(); url.pathname = "/chat";
    return NextResponse.redirect(url);
  }
  // Forward protection: guests can't access app routes
  if (!user && isProtected) {
    const url = request.nextUrl.clone(); url.pathname = "/login";
    url.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(url);
  }
  return supabaseResponse;
}
```

### `middleware.ts` (root)
```ts
import { type NextRequest } from "next/server";
import { updateSession } from "./src/utils/supabase/middleware";
export async function middleware(request: NextRequest) { return updateSession(request); }
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
```

---

## 2. Auth Provider (Session Store)

### `src/components/providers/auth-provider.tsx`
Wraps entire app. Exposes `user`, `session`, `isLoading`, `signOut`, and critically `refreshSession` (needed to sync client after server-side login).

```tsx
"use client";
import { createContext, useEffect, useState, ReactNode } from "react";
import { createClient } from "@/utils/supabase/client";
import { Session, User } from "@supabase/supabase-js";

type AuthContextType = {
  session: Session | null; user: User | null; isLoading: boolean;
  signOut: () => Promise<void>; refreshSession: () => Promise<void>;
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
      const { data: { session: s } } = await supabase.auth.getSession();
      setSession(s); setUser(s?.user ?? null);
    } catch (e) { console.error("Error refreshing session:", e); }
    finally { setIsLoading(false); }
  };

  useEffect(() => {
    refreshSession();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s); setUser(s?.user ?? null); setIsLoading(false);
    });
    return () => { subscription.unsubscribe(); };
  }, [supabase]);

  const signOut = async () => {
    await supabase.auth.signOut(); setSession(null); setUser(null);
    window.location.href = "/login"; // window.location (not router.push) to bust Next.js cache
  };

  return (
    <AuthContext.Provider value={{ session, user, isLoading, signOut, refreshSession }}>
      {children}
    </AuthContext.Provider>
  );
}
```

### `src/hooks/use-auth.ts`
```ts
"use client";
import { useContext } from "react";
import { AuthContext } from "@/components/providers/auth-provider";
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
```

---

## 3. Root Layout — Provider Wrapping

### `src/app/layout.tsx`
`suppressHydrationWarning` prevents errors from browser extensions injecting attributes into `<html>`.

```tsx
import { AuthProvider } from "@/components/providers/auth-provider";
// ... font imports (Inter, Manrope), globals.css ...
export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${manrope.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-full flex flex-col bg-[var(--background)] text-[var(--on-surface)]">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
```

---

## 4. Server Actions

### `src/app/actions/auth.ts`
`login()` returns `{ success: true }` instead of calling `redirect()` — this lets the client call `refreshSession()` before navigating (fixes sidebar "Loading..." bug).

```ts
'use server'
import { revalidatePath } from 'next/cache'; import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';

export async function login(formData: FormData) {
  const supabase = await createClient();
  let email = formData.get('identifier') as string;
  const password = formData.get('password') as string;
  // Username → email resolution
  if (!email.includes('@')) {
    const { data: profile } = await supabase.from('profiles').select('email').eq('username', email).single();
    if (!profile?.email) return { error: 'No account found with that username.' };
    email = profile.email;
  }
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };
  revalidatePath('/', 'layout');
  return { success: true }; // NOT redirect — client needs to refreshSession() first
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut(); revalidatePath('/', 'layout'); redirect('/login');
}

export async function signup(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: formData.get('email') as string, password: formData.get('password') as string,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      data: { username: formData.get('username'), wallet_address: formData.get('walletAddress') },
    },
  });
  if (error) return { error: error.message };
  revalidatePath('/', 'layout');
  redirect('/login?message=Check your email to confirm your account');
}
```

---

## 5. Login Page — Critical `refreshSession()` Call

### `src/app/login/page.tsx` (key parts)
After `login()` succeeds, `await refreshSession()` syncs the client context with the new server cookies BEFORE navigating. The Shield logo is wrapped in `<Link href="/">` to allow navigating back to the landing page.

```tsx
const { refreshSession } = useAuth();
const handleSubmit = async (formData: FormData) => {
  const result = await login(formData);
  if (result?.error) { setError(result.error); return; }
  await refreshSession();          // ← THIS is the critical fix
  router.replace(redirectTo);
};
// Logo at top of page:
<Link href="/" className="mb-8 flex flex-col items-center hover:scale-105 transition-transform">
  <Shield className="h-8 w-8" />
  <h1>Sentinel</h1>
</Link>
```

---

## 6. Sidebar — Profile & Logout

### `src/components/layout/Sidebar.tsx` (key parts)
Username resolution: DB profile → auth metadata → email prefix → "Sentinel" fallback. Logout uses `signOut()` from `useAuth()`.

```tsx
const { user, isLoading: isAuthLoading, signOut } = useAuth();
useEffect(() => {
  if (!isAuthLoading && user) {
    // Fetch username from profiles table, fallback chain:
    // profile.username || user_metadata.username || email.split("@")[0] || "Sentinel"
  }
}, [user, isAuthLoading]);

<button onClick={() => signOut()} className="hover:bg-red-500/10 hover:text-red-400">
  <LogOut /> Log out
</button>
// Profile card shows "Loading..." while isAuthLoading, then username + initials
```

---

## 7. Chat Page — Security Handshake (Anti-Flicker)

### `src/app/chat/page.tsx` (key parts)
Defaults to `loading = true`. Shows a branded shield screen until auth is verified. Prevents any unauthorized UI flash.

```tsx
const [loading, setLoading] = useState(true);
useEffect(() => {
  const getUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    // ... fetch profile, messages ...
    setLoading(false);
  };
  getUser();
}, []);

if (loading) return (
  <div className="h-screen bg-[#05070a] flex flex-col items-center justify-center">
    <Shield className="w-16 h-16 animate-pulse" /> {/* + spinning orbits */}
    <p>Establishing Security Handshake</p>
  </div>
);
// Actual <Sidebar />, <ChatFeed />, etc. only render after loading = false
```

---

## 8. Landing Page UI

### Glassmorphism Navbar (`src/app/page.tsx`)
```tsx
<nav className="fixed top-0 w-full z-50 bg-[#020305]/40 backdrop-blur-2xl backdrop-saturate-[180%] border-b border-white/[0.05] shadow-2xl">
```

### Shield Mascot — Icon sizing via inline styles (Tailwind classes don't work on Material Symbols)
```tsx
<div className="w-56 h-56 md:w-60 md:h-60 rounded-[2.5rem] ... overflow-visible rotate-12">
  <span className="material-symbols-outlined block leading-none text-primary"
    style={{ fontVariationSettings: "'FILL' 1", fontSize: 'clamp(120px, 30vw, 120px)', lineHeight: '1' }}>
    shield_with_heart
  </span>
</div>
{/* Energy Orbits: absolute inset-0 border rounded-full at scale-125, scale-150, scale-[1.75] */}
```
**To adjust size**: change `fontSize` in the `style` prop and container `w-*/h-*` classes.

---

## Quick Reference — Pitfalls & Fixes

| Problem | Fix |
|---|---|
| Sidebar stuck on "Loading..." after login | Call `await refreshSession()` before `router.replace()` in login handler |
| Chat UI flickers before auth check | Default `loading = true`, render shield screen, only show UI after `getUser()` |
| Logout doesn't clear cached pages | Use `window.location.href` not `router.push` |
| Browser extension hydration mismatch | `suppressHydrationWarning` on `<html>` |
| Material icon ignores Tailwind sizes | Use inline `style={{ fontSize: '...' }}` |
| New routes aren't protected | Add path to `protectedPaths` array in `updateSession()` |
