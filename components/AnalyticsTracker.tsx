"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

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

  useEffect(() => {
    if (typeof window === "undefined") return;

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
  }, [pathname]);

  return null;
}
