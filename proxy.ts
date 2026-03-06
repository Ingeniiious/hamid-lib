import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days
const SESSION_COOKIE_MARKER = "session_token";

const ALLOWED_ORIGINS = new Set(
  [
    "https://libraryyy.com",
    "https://www.libraryyy.com",
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
    ...(process.env.NODE_ENV === "development"
      ? ["http://localhost:3000", "http://localhost:3001"]
      : []),
  ].filter(Boolean) as string[]
);

const neonMiddleware = auth.middleware({
  loginUrl: "/auth",
});

/**
 * Ensures session_token cookies have Max-Age so they persist across PWA restarts.
 * Neon Auth's upstream Better Auth sets session_token as a session cookie (no Max-Age),
 * which gets cleared when a standalone PWA is closed.
 */
function persistSessionCookies(response: NextResponse): NextResponse {
  const setCookieHeaders = response.headers.getSetCookie();
  if (setCookieHeaders.length === 0) return response;

  let modified = false;
  const newCookies: string[] = [];

  for (const header of setCookieHeaders) {
    if (
      header.includes(SESSION_COOKIE_MARKER) &&
      !header.toLowerCase().includes("max-age")
    ) {
      newCookies.push(`${header}; Max-Age=${SESSION_MAX_AGE}`);
      modified = true;
    } else {
      newCookies.push(header);
    }
  }

  if (!modified) return response;

  response.headers.delete("set-cookie");
  for (const cookie of newCookies) {
    response.headers.append("set-cookie", cookie);
  }
  return response;
}

/**
 * CSRF protection: reject cross-origin state-changing requests to /api/ routes.
 * GET/HEAD/OPTIONS are safe (read-only). For POST/PUT/PATCH/DELETE, the Origin
 * (or Referer) must match an allowed origin. Cron requests authenticated by
 * Bearer token are exempted.
 */
function rejectCrossOrigin(request: NextRequest): NextResponse | null {
  if (!request.nextUrl.pathname.startsWith("/api/")) return null;

  const method = request.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return null;

  // Allow cron jobs authenticated via Bearer token (cron routes only)
  if (
    request.nextUrl.pathname.startsWith("/api/cron/") &&
    request.headers.get("authorization")?.startsWith("Bearer ")
  ) return null;

  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");

  if (origin) {
    if (!ALLOWED_ORIGINS.has(origin)) {
      return NextResponse.json(
        { error: "Forbidden — cross-origin request" },
        { status: 403 }
      );
    }
    return null;
  }

  // Fallback to Referer when Origin is missing (some older browsers)
  if (referer) {
    try {
      const refOrigin = new URL(referer).origin;
      if (!ALLOWED_ORIGINS.has(refOrigin)) {
        return NextResponse.json(
          { error: "Forbidden — cross-origin request" },
          { status: 403 }
        );
      }
      return null;
    } catch {
      // Malformed referer
    }
  }

  // No Origin or Referer on a state-changing request — block it
  return NextResponse.json(
    { error: "Forbidden — missing origin" },
    { status: 403 }
  );
}

export default async function proxy(request: NextRequest) {
  // CSRF check for all API routes
  const csrfBlock = rejectCrossOrigin(request);
  if (csrfBlock) return csrfBlock;

  // Skip auth middleware for server action requests — the body gets consumed
  // by Neon Auth's proxy handler, breaking the server action payload.
  // Auth is already verified by the dashboard layout's server component.
  if (
    request.method === "POST" &&
    (request.headers.has("next-action") ||
      request.headers.get("content-type")?.includes("text/x-component"))
  ) {
    return NextResponse.next();
  }

  // API routes don't need Neon Auth session middleware — they handle auth themselves
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const response = await neonMiddleware(request);
  return persistSessionCookies(response);
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/api/:path*"],
};
