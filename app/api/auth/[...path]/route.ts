import { auth } from "@/lib/auth";

const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days in seconds
const SESSION_COOKIE_MARKER = "session_token";

/**
 * Neon Auth's upstream Better Auth server sets session_token as a session cookie
 * (no Max-Age), which gets cleared when a PWA is closed. This wrapper injects
 * Max-Age on session_token cookies so sessions persist across app restarts.
 */
function persistSessionCookies(response: Response): Response {
  const setCookieHeaders = response.headers.getSetCookie();
  if (setCookieHeaders.length === 0) return response;

  const newHeaders = new Headers(response.headers);
  newHeaders.delete("set-cookie");

  for (const header of setCookieHeaders) {
    if (
      header.includes(SESSION_COOKIE_MARKER) &&
      !header.toLowerCase().includes("max-age")
    ) {
      // Append Max-Age to persist the session cookie
      newHeaders.append("set-cookie", `${header}; Max-Age=${SESSION_MAX_AGE}`);
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
