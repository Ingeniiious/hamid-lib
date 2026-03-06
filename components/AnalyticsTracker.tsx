"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { authClient } from "@/lib/auth-client";

function getSessionId() {
  if (typeof window === "undefined") return null;
  let id = sessionStorage.getItem("analytics-session-id");
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem("analytics-session-id", id);
  }
  return id;
}

export function AnalyticsTracker() {
  const pathname = usePathname();
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [sessionReady, setSessionReady] = useState(false);
  const userIdRef = useRef<string | null>(null);

  // Fetch userId once on mount + auto-detect timezone
  useEffect(() => {
    // Only call getSession if a session cookie exists (avoids cold-start network call for anon users)
    const hasSessionCookie = document.cookie.includes("session_token");
    if (!hasSessionCookie) {
      setSessionReady(true);
      return;
    }

    authClient
      .getSession()
      .then(({ data }) => {
        userIdRef.current = data?.user?.id || null;

        // Save timezone once per session (auto-detect from browser)
        if (data?.user?.id && !sessionStorage.getItem("tz-saved")) {
          const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
          if (tz) {
            fetch("/api/profile/timezone", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ timezone: tz }),
              keepalive: true,
            })
              .then(() => sessionStorage.setItem("tz-saved", "1"))
              .catch(() => {});
          }
        }
      })
      .catch(() => {})
      .finally(() => setSessionReady(true));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !sessionReady) return;

    // Check consent
    const consent = localStorage.getItem("analytics-consent");
    if (consent !== "accepted") return;

    // Debounce to avoid double-fires
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      const sessionId = getSessionId();
      fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "pageview",
          path: pathname,
          sessionId,
        }),
        keepalive: true,
      }).catch(() => {});
    }, 300);

    return () => clearTimeout(timeoutRef.current);
  }, [pathname, sessionReady]);

  return null;
}
