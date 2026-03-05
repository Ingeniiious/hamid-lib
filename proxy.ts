import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days
const SESSION_COOKIE_MARKER = "session_token";

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

export default async function proxy(request: NextRequest) {
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

  const response = await neonMiddleware(request);
  return persistSessionCookies(response);
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};
