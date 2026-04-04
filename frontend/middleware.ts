import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
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

  // Refresh session and check user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Configuration
  const authRoutes = ["/login", "/register", "/forgot-password"];
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));
  const isRoot = pathname === "/";
  const isCallback = pathname.startsWith("/auth");

  console.log(`Middleware: Processing ${pathname} | User: ${!!user} | isAuthRoute: ${isAuthRoute} | isRoot: ${isRoot}`);

  // Skip middleware for special callbacks (e.g., email confirmation)
  if (isCallback) return supabaseResponse;

  // 1. Reverse Protection: Logged-in users redirected away from login/register
  if (user && isAuthRoute) {
    console.log(`Middleware: Redirecting auth'd user from ${pathname} to /chat`);
    const url = request.nextUrl.clone();
    url.pathname = "/chat";
    return NextResponse.redirect(url);
  }

  // 2. Aggressive Protection for Chat and other app routes
  const protectedPaths = ["/chat", "/profile", "/settings"];
  const isProtectedPath = protectedPaths.some((path) => pathname.startsWith(path));

  if (!user && isProtectedPath) {
    console.log(`Middleware: INTERCEPTED unauthorized request to ${pathname}. Redirecting to /login.`);
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};