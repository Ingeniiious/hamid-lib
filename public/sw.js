// Service Worker for Libraryyy PWA
// Handles push notifications and notification clicks

self.addEventListener("push", (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const { title, body, url, category } = data;

  const options = {
    body,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: data.tag || "libraryyy-notification",
    data: { url: url || "/dashboard/me/calendar" },
    vibrate: [200, 100, 200],
    actions: [{ action: "open", title: "View" }],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data?.url || "/dashboard/me/calendar";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      // Focus existing tab if one is open
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      // Otherwise open a new window
      return clients.openWindow(url);
    })
  );
});

// Minimal install/activate — no cache strategy (Next.js handles caching)
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(clients.claim()));
