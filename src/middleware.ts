import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, verifyAdminToken } from "@/lib/auth";

// Gate all /admin routes behind the admin_token cookie. The login page itself
// is excluded (see the matcher + the explicit check) so it stays reachable.
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Let the login page through unauthenticated.
  if (pathname === "/admin/login") {
    return NextResponse.next();
  }

  const token = req.cookies.get(ADMIN_COOKIE)?.value;
  const valid = await verifyAdminToken(token);

  if (!valid) {
    const loginUrl = new URL("/admin/login", req.url);
    // Remember where they were headed so we can return there post-login.
    if (pathname !== "/admin") {
      loginUrl.searchParams.set("from", pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Run only on /admin and its subpaths.
  matcher: ["/admin/:path*"],
};
