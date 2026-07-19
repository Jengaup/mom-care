"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { saveDailyNote } from "@/app/(app)/actions/notes";

/** Nota del día con autoguardado al salir del campo (spec pantalla 7). */
export function NoteEditor({ initial }: { initial: string }) {
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const lastSaved = useRef(initial);

  async function save() {
    if (value === lastSaved.current) return;
    setStatus("saving");
    const res = await saveDailyNote(value);
    if (res.ok) {
      lastSaved.current = value;
      setStatus("saved");
      router.refresh();
    } else {
      setStatus("error");
    }
  }

  return (
    <div className="space-y-1">
      <textarea
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setStatus("idle");
        }}
        onBlur={save}
        rows={5}
        placeholder="¿Cómo estuvo el día? Sueño, apetito, ánimo, incidencias…"
        className="w-full rounded-2xl border border-gray-300 p-4 text-base"
      />
      <p className="h-5 text-right text-sm text-gray-400">
        {status === "saving"
          ? "Guardando…"
          : status === "saved"
            ? "Guardado"
            : status === "error"
              ? "No se pudo guardar"
              : ""}
      </p>
    </div>
  );
}
