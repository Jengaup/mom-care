"use client";

import { Button } from "@/components/ui/Button";

/** Abre el diálogo de impresión del navegador (Guardar como PDF). */
export function PrintButton() {
  return (
    <Button className="no-print w-full" onClick={() => window.print()}>
      Imprimir / Guardar PDF
    </Button>
  );
}
