"use client";

import { useEffect } from "react";

/** Registra el service worker (app shell). */
export function RegisterSW() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Sin SW la app sigue funcionando; no es crítico.
      });
    }
  }, []);
  return null;
}
