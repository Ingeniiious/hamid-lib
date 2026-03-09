import { createNeonAuth } from "@neondatabase/auth/next/server";

export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL!,
  cookies: {
    secret: process.env.NEON_AUTH_COOKIE_SECRET!,
    // Cache session data for 1 hour (default 5 min). Reduces revalidation
    // calls to the auth API. The session_token cookie itself is validated
    // by Better Auth's sliding window — this only controls the server-side
    // cache of session metadata.
    sessionDataTtl: 3600,
  },
});
