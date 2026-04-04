import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

/**
 * Middleware to manage Supabase sessions and protect routes.
 * Runs on every request defined by the matcher.
 */
export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

    // Defensive check: if env vars are missing, we can't initialize Supabase.
    // Instead of crashing the middleware (500), we log and proceed as unauthenticated.
    if (!supabaseUrl || !supabaseKey) {
      console.error("MIDDLEWARE_CONFIG_ERROR: Missing Supabase environment variables.");
      return supabaseResponse;
    }

    const supabase = createServerClient(
      supabaseUrl,
      supabaseKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            // Setting cookies on both request and response for consistency in Edge
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            );
            supabaseResponse = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    // Refresh session — do NOT add logic between createServerClient and getUser()
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Protect routes: redirect unauthenticated users to /login
    const publicRoutes = ["/login", "/register", "/forgot-password", "/auth"];
    const isPublicRoute = publicRoutes.some((route) =>
      request.nextUrl.pathname.startsWith(route)
    );

    if (!user && !isPublicRoute && request.nextUrl.pathname !== "/") {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
  } catch (error) {
    // Prevent the entire site from returning a 500 if middleware logic fails.
    console.error("MIDDLEWARE_CRITICAL_ERROR:", error);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
