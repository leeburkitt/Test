"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      // Never register in dev: the service worker cache-first's /_next/static/ assuming
      // they're content-hashed like a production build, but Turbopack dev chunks aren't
      // stable the same way — after a rebuild the SW can keep serving a stale chunk,
      // silently breaking already-working features. Clean up any registration left over
      // from before this guard existed.
      navigator.serviceWorker.getRegistrations().then((regs) => {
        for (const reg of regs) reg.unregister();
      });
      if ("caches" in window) {
        caches.keys().then((keys) => {
          for (const key of keys) caches.delete(key);
        });
      }
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.error("Service worker registration failed:", err);
    });
  }, []);

  return null;
}
