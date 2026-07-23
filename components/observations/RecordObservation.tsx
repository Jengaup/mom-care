"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import {
  recordObservation,
  undoObservation,
} from "@/app/(app)/actions/observations";
import { recordAttachment } from "@/app/(app)/actions/attachments";
import { createClient } from "@/lib/supabase/client";
import { APP_TIMEZONE } from "@/lib/time";
import { OBS_CONFIG, OBS_ORDER, type ObsType } from "@/lib/observations";

const field = "min-h-touch w-full rounded-xl border border-line px-4 text-base";
const BUCKET = "attachments";
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

/** Fecha y hora en AST para nombrar el archivo (ej. 2026-07-23_14-30). */
function stampNow(): { file: string; label: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const date = `${get("year")}-${get("month")}-${get("day")}`;
  const time = `${get("hour")}-${get("minute")}`;
  return { file: `${date}_${time}`, label: `${date} ${get("hour")}:${get("minute")}` };
}

function extOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i).toLowerCase() : "";
}

export function RecordObservation({ patientId }: { patientId: string }) {
  const router = useRouter();
  const [type, setType] = useState<ObsType>("blood_pressure");
  const [num, setNum] = useState("");
  const [text, setText] = useState("");
  const [unit, setUnit] = useState(OBS_CONFIG.blood_pressure.unit ?? "");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [lastLog, setLastLog] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [photoMsg, setPhotoMsg] = useState("");

  const cfg = OBS_CONFIG[type];

  async function uploadPhoto(fileObj: File) {
    setPhotoMsg("");
    if (fileObj.size > MAX_BYTES) {
      setPhotoMsg("El archivo es muy grande (máx. 10 MB).");
      return;
    }
    setUploading(true);
    try {
      const supabase = createClient();
      const stamp = stampNow();
      const ext = extOf(fileObj.name) || (fileObj.type === "application/pdf" ? ".pdf" : ".jpg");
      const renamed = `piel_${stamp.file}${ext}`;
      const path = `${patientId}/${crypto.randomUUID()}-${renamed}`;
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, fileObj, { contentType: fileObj.type || undefined });
      if (upErr) {
        setPhotoMsg("No se pudo subir el archivo.");
        setUploading(false);
        return;
      }
      const res = await recordAttachment({
        storagePath: path,
        fileName: renamed,
        mimeType: fileObj.type || null,
        note: `Piel / úlceras — ${stamp.label}${text.trim() ? ` · ${text.trim()}` : ""}`,
      });
      if (res.ok) {
        if (fileRef.current) fileRef.current.value = "";
        setPhotoMsg("Foto guardada en Documentos ✓");
        router.refresh();
      } else {
        setPhotoMsg(res.message ?? "Error");
      }
    } catch {
      setPhotoMsg("No se pudo subir el archivo.");
    } finally {
      setUploading(false);
    }
  }

  function pick(t: ObsType) {
    setType(t);
    setNum("");
    setText("");
    setUnit(OBS_CONFIG[t].unit ?? "");
    setMsg("");
  }

  async function save() {
    setMsg("");
    if (cfg.kind === "text" && !text.trim()) {
      setMsg("Escribe un valor.");
      return;
    }
    if ((cfg.kind === "num" || cfg.kind === "pain") && num === "") {
      setMsg("Escribe un valor.");
      return;
    }
    setSaving(true);
    const res = await recordObservation({
      type,
      valueNum: cfg.kind === "text" ? null : Number(num),
      valueText: cfg.kind === "text" ? text : null,
      unit: cfg.kind === "num" ? unit || null : null,
      note: note || null,
    });
    setSaving(false);
    if (res.ok) {
      setNum("");
      setText("");
      setNote("");
      setMsg("Registrado ✓");
      setLastLog(res.logId ?? null);
      router.refresh();
    } else {
      setMsg(res.message ?? "Error");
    }
  }

  async function undo() {
    if (!lastLog) return;
    setSaving(true);
    const res = await undoObservation(lastLog);
    setSaving(false);
    if (res.ok) {
      setLastLog(null);
      setMsg("");
      router.refresh();
    } else {
      setMsg(res.message ?? "No se pudo deshacer");
    }
  }

  return (
    <Card className="space-y-3">
      <CardTitle>Registrar signo</CardTitle>

      <div className="grid grid-cols-3 gap-2">
        {OBS_ORDER.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => pick(t)}
            className={`min-h-touch rounded-xl border px-2 text-sm font-semibold ${
              type === t
                ? "border-brand bg-brand-soft text-brand-dark"
                : "border-line text-muted"
            }`}
          >
            {OBS_CONFIG[t].label}
          </button>
        ))}
      </div>

      {cfg.kind === "text" ? (
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={
            type === "blood_pressure"
              ? "Ej. 120/80"
              : type === "skin"
                ? "Ej. enrojecimiento en talón izquierdo"
                : "Valor"
          }
          className={field}
        />
      ) : cfg.kind === "pain" ? (
        <input
          value={num}
          onChange={(e) => setNum(e.target.value)}
          inputMode="numeric"
          placeholder="0 a 10"
          className={field}
        />
      ) : (
        <div className="flex gap-2">
          <input
            value={num}
            onChange={(e) => setNum(e.target.value)}
            inputMode="decimal"
            placeholder="Valor"
            className={field}
          />
          <input
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            placeholder="Unidad"
            className={`${field} max-w-28`}
          />
        </div>
      )}

      {type === "skin" ? (
        <div className="space-y-2 rounded-xl border border-line bg-black/[0.02] p-3">
          <p className="text-sm font-semibold text-ink/80">
            Foto o documento de la piel/úlcera
          </p>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,application/pdf"
            capture="environment"
            disabled={uploading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void uploadPhoto(f);
            }}
            className="block w-full text-sm text-muted file:mr-3 file:min-h-touch file:rounded-xl file:border-0 file:bg-brand file:px-4 file:font-semibold file:text-white"
          />
          <p className="text-xs text-muted">
            Se guarda en Documentos con la fecha en el nombre.
            {uploading ? " Subiendo…" : ""}
          </p>
          {photoMsg ? (
            <p className="text-sm text-muted">{photoMsg}</p>
          ) : null}
        </div>
      ) : null}

      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Nota (opcional)"
        className={field}
      />

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={saving}>
          {saving ? "Guardando…" : "Registrar"}
        </Button>
        {lastLog ? (
          <Button variant="ghost" className="px-3" onClick={undo} disabled={saving}>
            Deshacer
          </Button>
        ) : null}
        {msg ? <span className="text-sm text-muted">{msg}</span> : null}
      </div>
    </Card>
  );
}
