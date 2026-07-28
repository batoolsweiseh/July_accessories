import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const url = request.nextUrl;

  // Always allow the login page
  if (url.pathname === "/admin/login") {
    return NextResponse.next();
  }

  if (url.pathname.startsWith("/admin")) {
    const session = request.cookies.get("admin_session");
    const adminPassword = process.env.ADMIN_PASSWORD || "admin123";

    if (session?.value === adminPassword) {
      return NextResponse.next();
    }

    // Not authenticated — redirect to login
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("from", url.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
