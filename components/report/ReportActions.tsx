"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

/** Acciones del reporte: imprimir/guardar PDF y compartir un resumen de texto
 * (Web Share API con respaldo de copiar al portapapeles). */
export function ReportActions({
  shareTitle,
  shareText,
}: {
  shareTitle: string;
  shareText: string;
}) {
  const [msg, setMsg] = useState("");

  async function share() {
    setMsg("");
    // navigator.share solo existe en contexto seguro (https) y móviles/algunos
    // navegadores de escritorio.
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: shareTitle, text: shareText });
        return;
      } catch {
        // El usuario canceló o falló: intentamos copiar.
      }
    }
    try {
      await navigator.clipboard.writeText(shareText);
      setMsg("Resumen copiado al portapapeles.");
    } catch {
      setMsg("Tu navegador no permite compartir aquí. Usa «Guardar PDF».");
    }
  }

  return (
    <div className="no-print space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <Button className="w-full" onClick={() => window.print()}>
          Imprimir / Guardar PDF
        </Button>
        <Button variant="secondary" className="w-full" onClick={share}>
          Compartir resumen
        </Button>
      </div>
      {msg ? <p className="text-sm text-muted">{msg}</p> : null}
      <p className="text-xs text-muted">
        «Guardar PDF»: en el diálogo de impresión elige «Guardar como PDF».
        «Compartir»: envía un resumen por WhatsApp, correo, etc.
      </p>
    </div>
  );
}
