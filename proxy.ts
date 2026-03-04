import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

const neonMiddleware = auth.middleware({
  loginUrl: "/auth",
});

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

  return neonMiddleware(request);
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};
