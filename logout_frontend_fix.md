# Sentinel Platform: Frontend Architecture & Auth Specification

This document provides a complete technical specification of the Sentinel frontend application. It details the authentication flow, session management, routing rules, and key UI implementations. It is designed to allow an AI or developer to fully recreate the core application structure and logic.

## 1. Technology Stack & Design System
*   **Framework**: Next.js (App Router, Server Actions)
*   **Authentication/BaaS**: Supabase & `@supabase/ssr`
*   **Styling**: Tailwind CSS
*   **Icons**: Lucide React & Google Material Symbols
*   **Design Language ("Obsidian Nexus")**: Premium, dark-mode-first aesthetics. Relies heavily on glassmorphism (`backdrop-blur-2xl`), deep color saturation (`backdrop-saturate-[180%]`), and tonal shifts between surface layers (`surface-container-low` to `highest`) rather than harsh borders.

---

## 2. Authentication & Session Architecture

The application uses robust HTTP-Only cookies to manage sessions securely in a Server-Side Rendered (SSR) environment.

### A. Supabase Client Configurations
To bridge Next.js's native `cookies()` API with Supabase Auth, three distinct clients are maintained:

1.  **Client-Side (`src/utils/supabase/client.ts`)**: Uses `createBrowserClient` for browser-only operations.
2.  **Server-Side (`src/utils/supabase/server.ts`)**: Uses `createServerClient`. It implements custom `getAll()` and `setAll()` methods mapped directly to `await cookies()`. This allows Server Actions (like `logout()`) to modify session cookies safely.
3.  **Middleware Client (`src/utils/supabase/middleware.ts`)**: A specialized `updateSession(request)` function runs before server renders. It extracts tokens from the incoming HTTP request and actively refreshes them if expired, ensuring the user's session never drops silently.

### B. Global State Management (`src/components/providers/auth-provider.tsx`)
Authentication state (`session`, `user`, `isLoading`) is distributed globally via React Context.
*   **Mounting**: On initial load, it runs `refreshSession()` which calls `supabase.auth.getSession()` to fetch the immediate server-validated session.
*   **Real-time Tracking**: It leverages `supabase.auth.onAuthStateChange` to keep the context instantly updated if the session expires dynamically.
*   **Client Syncing**: Exposes the `refreshSession()` function directly to the `<AuthContext.Provider>`. Because Next.js soft-navigates after Server Actions, this function is critical to force the client context to recognize new logins without a hard page reload.

### C. The `useAuth` Hook (`src/hooks/use-auth.ts`)
A custom hook that returns `context`. It throws an error if called outside the `<AuthProvider>`, enforcing strict provider wrapping at the `layout.tsx` level.

---

## 3. Routing & Protection

### A. Application Middleware (`middleware.ts`)
The root `middleware.ts` delegates execution to the `updateSession()` engine. Inside `updateSession`, precise path matching ensures zero unauthorized access:

*   **Protected Route Rule**: If a user is NOT logged in and attempts to access `['/chat', '/cases', '/profile', '/settings']`, they are interrupted with a `NextResponse.redirect` to `/login`.
*   **Intelligent Redirection**: It tracks the blocked URL by appending `?redirectTo=${pathname}`.
*   **Reverse Logic**: If a user IS logged in and attempts to access authentication routes (`/login`, `/register`), they are instantly redirected to the primary feature (`/chat`).

### B. Client-side Flicker Prevention
Main feature routes (e.g., `src/app/chat/page.tsx`) default to a secure `loading = true` state. They do not render the sidebar or chat feed until the `AuthProvider` completely verifies a user object exists. If `user` is missing locally, it renders a "Security Handshake" fallback screen to prevent layout flickering.

---

## 4. The Login Flow 

### A. Server Action (`src/app/actions/auth.ts`)
Form submission triggers the purely server-side `login(formData)` function.
*   **Username Resolution**: It accepts either an email or a username. If a username (no `@` symbol) is detected, it queries the custom `profiles` table to resolve the associated email address.
*   **Authentication**: Invokes `supabase.auth.signInWithPassword()`. This natively attaches the HTTP-Only auth cookies to the response.

### B. The Login UI (`src/app/login/page.tsx`)
*   Executes the `login()` server action.
*   *Crucial Step*: Upon success, it halts the redirect to explicitly await `refreshSession()` imported from `useAuth()`. This forces the client context to sync with the newly set cookies.
*   Finally, uses `router.replace(redirectTo)` for smooth transition to the application.

---

## 5. Layout & Frontend UI Elements

### A. The Sidebar (`src/components/layout/Sidebar.tsx`)
*   **Dynamic User Display**: A `useEffect` waits for `isAuthLoading` to clear. Once authenticated, it fetches the `username` from the database. It falls back gracefully: Database Profile `->` Metadata `->` Email Prefix `->` "Sentinel".
*   **Logout Injection**: The logout button calls the `signOut()` method cleanly, destroying both the Supabase session and Context data, followed by a `window.location.href = '/login'` to wipe the Next.js router cache entirely.

### B. The Landing Page & Nav (`src/app/page.tsx`)
*   **Glassmorphism Nav**: Fixed to the top, styled with `bg-[#020305]/40 backdrop-blur-2xl backdrop-saturate-[180%] border-white/[0.05] shadow-2xl` for a dense, translucent effect. Contains a logo that routes back to `/`.
*   **Hero Shield Implementation**:
    *   **Orbits**: Floating, pulsing rings layered behind the shield using `absolute inset-0 border-2 rounded-full`. Kept extremely large (`scale-[1.8]` to `scale-[2.4]`) for dramatic background presence.
    *   **Scaling Logic**: The central Material Icon (`shield_with_heart`) is detached from typical container constraints using inline properties: `style={{ fontSize: 'clamp(120px, 30vw, 120px)', lineHeight: '1' }}`. This produces a monolithic, perfectly scaled emblem regardless of standard layout padding.
