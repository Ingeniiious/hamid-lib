import { auth } from "@/lib/auth";

const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days in seconds

/**
 * Matches any auth-related cookie set by Neon Auth / Better Auth.
 * Catches: session_token, session_data, neonauth.*, better-auth.*, etc.
 */
const AUTH_COOKIE_RE = /session_token|session_data|neonauth|better-auth/i;

/**
 * Ensures ALL auth cookies persist across PWA restarts by forcing
 * Max-Age=30days AND Expires. The upstream Neon Auth server (Better Auth)
 * may set a shorter Max-Age (7 days) or omit it entirely (session cookie).
 * Either way, we override to 30 days for PWA reliability.
 *
 * iOS standalone PWAs (WebKit) need BOTH Max-Age AND Expires for reliable
 * cookie persistence — Max-Age alone is not always respected.
 */
function persistSessionCookies(response: Response): Response {
  const setCookieHeaders = response.headers.getSetCookie();
  if (setCookieHeaders.length === 0) return response;

  const newHeaders = new Headers(response.headers);
  newHeaders.delete("set-cookie");

  const expires = new Date(Date.now() + SESSION_MAX_AGE * 1000).toUTCString();

  for (const header of setCookieHeaders) {
    if (AUTH_COOKIE_RE.test(header)) {
      // Strip any existing Max-Age/Expires so we can set our own
      let cleaned = header
        .replace(/;\s*Max-Age=[^;]*/gi, "")
        .replace(/;\s*Expires=[^;]*/gi, "");
      cleaned += `; Max-Age=${SESSION_MAX_AGE}; Expires=${expires}`;
      newHeaders.append("set-cookie", cleaned);
    } else {
      newHeaders.append("set-cookie", header);
    }
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

function wrapHandler(
  handler: (req: Request, ctx: any) => Promise<Response>
): (req: Request, ctx: any) => Promise<Response> {
  return async (req, ctx) => {
    const response = await handler(req, ctx);
    return persistSessionCookies(response);
  };
}

const handlers = auth.handler();

export const GET = wrapHandler(handlers.GET);
export const POST = wrapHandler(handlers.POST);
export const PUT = wrapHandler(handlers.PUT);
export const DELETE = wrapHandler(handlers.DELETE);
export const PATCH = wrapHandler(handlers.PATCH);
