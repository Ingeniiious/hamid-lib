"use server";

const RATE_LIMITER_URL = process.env.RATE_LIMITER_URL || "https://r.verifisere.com";
const RATE_LIMITER_TOKEN = process.env.RATE_LIMITER_TOKEN || "";

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfter: number;
}

export async function rateLimit(
  key: string,
  limit: number,
  window: number
): Promise<RateLimitResult> {
  try {
    const res = await fetch(`${RATE_LIMITER_URL}/api/check`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RATE_LIMITER_TOKEN}`,
      },
      body: JSON.stringify({ key, limit, window }),
      signal: AbortSignal.timeout(3000),
    });

    if (!res.ok) {
      // Fail open
      return { allowed: true, remaining: limit, retryAfter: 0 };
    }

    return await res.json();
  } catch {
    // Fail open — never block users if service is down
    return { allowed: true, remaining: limit, retryAfter: 0 };
  }
}
