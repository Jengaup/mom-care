"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { recordObservation } from "@/app/(app)/actions/observations";
import { OBS_CONFIG, OBS_ORDER, type ObsType } from "@/lib/observations";

const field = "min-h-touch w-full rounded-xl border border-line px-4 text-base";

export function RecordObservation() {
  const router = useRouter();
  const [type, setType] = useState<ObsType>("blood_pressure");
  const [num, setNum] = useState("");
  const [text, setText] = useState("");
  const [unit, setUnit] = useState(OBS_CONFIG.blood_pressure.unit ?? "");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const cfg = OBS_CONFIG[type];

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
      router.refresh();
    } else {
      setMsg(res.message ?? "Error");
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
        {msg ? <span className="text-sm text-muted">{msg}</span> : null}
      </div>
    </Card>
  );
}
