import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  console.log("MINIMAL_MIDDLEWARE_V2_RUNNING", request.nextUrl.pathname);
  return NextResponse.next();
}

export const config = {
  matcher: ["/:path*"],
};