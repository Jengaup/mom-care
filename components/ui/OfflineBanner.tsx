"use client";

import { useEffect, useState } from "react";

/** Banner claro cuando no hay conexión (spec 9 / 3.10). No finge guardados. */
export function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="sticky top-0 z-40 bg-status-late px-4 py-2 text-center text-sm font-semibold text-white">
      Sin conexión — no se puede registrar
    </div>
  );
}
