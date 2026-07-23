"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/client";
import { recordAttachment } from "@/app/(app)/actions/attachments";

const BUCKET = "attachments";
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

function safeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
}

export function AttachmentUpload({ patientId }: { patientId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function onFile(file: File) {
    setMsg("");
    if (file.size > MAX_BYTES) {
      setMsg("El archivo es muy grande (máx. 10 MB).");
      return;
    }
    setBusy(true);
    try {
      const supabase = createClient();
      const path = `${patientId}/${crypto.randomUUID()}-${safeName(file.name)}`;
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { contentType: file.type || undefined });
      if (upErr) {
        setMsg("No se pudo subir el archivo.");
        setBusy(false);
        return;
      }
      const res = await recordAttachment({
        storagePath: path,
        fileName: file.name,
        mimeType: file.type || null,
        note: note || null,
      });
      if (res.ok) {
        setNote("");
        if (inputRef.current) inputRef.current.value = "";
        setMsg("Subido ✓");
        router.refresh();
      } else {
        setMsg(res.message ?? "Error");
      }
    } catch {
      setMsg("No se pudo subir el archivo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="space-y-3">
      <CardTitle>Añadir foto o documento</CardTitle>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Descripción (ej. receta Dr. Ruiz)"
        className="min-h-touch w-full rounded-xl border border-line px-4 text-base"
      />
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        capture="environment"
        disabled={busy}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void onFile(f);
        }}
        className="block w-full text-sm text-muted file:mr-3 file:min-h-touch file:rounded-xl file:border-0 file:bg-brand file:px-4 file:font-semibold file:text-white"
      />
      <div className="flex items-center gap-3">
        {busy ? <span className="text-sm text-muted">Subiendo…</span> : null}
        {msg ? <span className="text-sm text-muted">{msg}</span> : null}
      </div>
      <p className="text-xs text-muted">
        Se guarda en privado; solo los cuidadores de este paciente pueden verlo.
      </p>
    </Card>
  );
}
