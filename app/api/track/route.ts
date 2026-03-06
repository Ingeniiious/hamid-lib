import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { pageView, analyticsEvent, userProfile } from "@/database/schema";
import { eq } from "drizzle-orm";
import { rateLimit } from "@/lib/rate-limit";
import { auth } from "@/lib/auth";

function parseUA(ua: string) {
  let deviceType = "desktop";
  if (/tablet|ipad/i.test(ua)) deviceType = "tablet";
  else if (/mobile|android|iphone/i.test(ua)) deviceType = "mobile";

  let browser = "unknown";
  if (/firefox/i.test(ua)) browser = "Firefox";
  else if (/edg/i.test(ua)) browser = "Edge";
  else if (/chrome/i.test(ua)) browser = "Chrome";
  else if (/safari/i.test(ua)) browser = "Safari";

  let os = "unknown";
  if (/windows/i.test(ua)) os = "Windows";
  else if (/mac os/i.test(ua)) os = "macOS";
  else if (/linux/i.test(ua)) os = "Linux";
  else if (/android/i.test(ua)) os = "Android";
  else if (/iphone|ipad/i.test(ua)) os = "iOS";

  return { deviceType, browser, os };
}

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  // Rate limit: 500 req/min per IP
  const rl = await rateLimit(`track:${ip}`, 500, 60);
  if (!rl.allowed) {
    return new NextResponse(null, { status: 429 });
  }

  try {
    const raw = await request.text();
    if (raw.length > 4096) {
      return new NextResponse(null, { status: 413 });
    }
    const body = JSON.parse(raw);
    const { type, path, eventName, properties, sessionId } = body;

    // Server-side session for trusted userId (never trust client-supplied userId)
    let verifiedUserId: string | null = null;
    try {
      const { data: session } = await auth.getSession();
      if (session?.user?.id) verifiedUserId = session.user.id;
    } catch {
      // Anonymous tracking is fine
    }

    const ua = request.headers.get("user-agent") || "";
    const referrer = request.headers.get("referer") || "";
    const country =
      request.headers.get("cf-ipcountry") ||
      request.headers.get("x-vercel-ip-country") ||
      null;
    const city = request.headers.get("x-vercel-ip-city") || null;
    const { deviceType, browser, os } = parseUA(ua);

    if (type === "pageview" && path) {
      await db.insert(pageView).values({
        path,
        userId: verifiedUserId,
        sessionId: sessionId || null,
        referrer: referrer || null,
        userAgent: ua || null,
        country,
        city,
        deviceType,
        browser,
        os,
      });

      // Update lastActiveAt for inactivity tracking (fire-and-forget)
      if (verifiedUserId) {
        db.update(userProfile)
          .set({ lastActiveAt: new Date() })
          .where(eq(userProfile.userId, verifiedUserId))
          .catch(() => {});
      }
    } else if (type === "event" && eventName) {
      await db.insert(analyticsEvent).values({
        eventName,
        properties: properties || null,
        userId: verifiedUserId,
        sessionId: sessionId || null,
      });
    }

    return new NextResponse(null, { status: 204 });
  } catch {
    return new NextResponse(null, { status: 400 });
  }
}
