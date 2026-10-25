import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_ADMIN = ["/admin/login", "/admin/forgot", "/admin/reset"];

/**
 * Cheap first gate for the staff console: no session cookie → login page.
 * The session itself and the user's role are verified on the server for every page and action.
 */
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC_ADMIN.some((p) => pathname.startsWith(p))) return NextResponse.next();
  if (!req.cookies.get("sfs_session")?.value) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = pathname === "/admin" ? "" : `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }
  const res = NextResponse.next();
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  res.headers.set("Cache-Control", "no-store");
  return res;
}

export const config = { matcher: ["/admin", "/admin/:path*"] };
