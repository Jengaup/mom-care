"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { setMedicationActive, restockMedication } from "@/app/(app)/actions/meds";

export type ManageMed = {
  id: string;
  name: string;
  dose: number | null;
  unit: string | null;
  freq: string;
  isActive: boolean;
  stock: {
    remaining: number;
    label: string | null;
    isLow: boolean;
    dosesLeft: number;
  } | null;
};

export function MedManageList({ meds }: { meds: ManageMed[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [restockFor, setRestockFor] = useState<string | null>(null);

  async function toggle(m: ManageMed) {
    setBusy(m.id);
    await setMedicationActive(m.id, !m.isActive);
    router.refresh();
    setBusy(null);
  }

  if (meds.length === 0) {
    return <EmptyState title="No hay medicamentos" hint="Añade uno con + Nuevo." />;
  }

  return (
    <div className="space-y-2">
      {meds.map((m) => (
        <Card
          key={m.id}
          accent={m.isActive ? undefined : "inactive"}
          className="space-y-2"
        >
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-semibold text-ink">
                {m.name}{" "}
                <span className="font-normal text-muted">
                  {m.dose != null ? `${m.dose} ${m.unit ?? ""}` : ""}
                </span>
              </p>
              <p className="text-sm text-muted">
                {m.freq}
                {m.isActive ? "" : " · inactivo"}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Link href={`/medicamentos/${m.id}/editar`}>
                <Button variant="secondary">Editar</Button>
              </Link>
              <Button
                variant="ghost"
                className="px-3"
                disabled={busy === m.id}
                onClick={() => toggle(m)}
              >
                {m.isActive ? "Desactivar" : "Activar"}
              </Button>
            </div>
          </div>

          {m.stock ? (
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-semibold ${
                  m.stock.isLow
                    ? "bg-status-late/10 text-status-late"
                    : "bg-brand-soft text-brand-dark"
                }`}
              >
                {m.stock.isLow ? "⚠ " : ""}
                Quedan {m.stock.remaining}
                {m.stock.label ? ` ${m.stock.label}` : " uds."}
                {m.stock.dosesLeft > 0 ? ` · ${m.stock.dosesLeft} dosis` : ""}
              </span>
              <Button
                variant="secondary"
                className="px-3"
                onClick={() =>
                  setRestockFor(restockFor === m.id ? null : m.id)
                }
              >
                Reabastecer
              </Button>
            </div>
          ) : null}

          {restockFor === m.id ? (
            <RestockForm
              medId={m.id}
              label={m.stock?.label ?? null}
              onDone={() => {
                setRestockFor(null);
                router.refresh();
              }}
            />
          ) : null}
        </Card>
      ))}
    </div>
  );
}

function RestockForm({
  medId,
  label,
  onDone,
}: {
  medId: string;
  label: string | null;
  onDone: () => void;
}) {
  const [units, setUnits] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  async function save() {
    const n = Number(units);
    if (!Number.isFinite(n) || n === 0) {
      setMsg("Escribe una cantidad.");
      return;
    }
    setSaving(true);
    const res = await restockMedication({ medicationId: medId, units: n, note });
    setSaving(false);
    if (res.ok) onDone();
    else setMsg(res.message ?? "Error");
  }

  return (
    <div className="space-y-2 border-t border-line pt-2">
      <div className="flex gap-2">
        <input
          value={units}
          onChange={(e) => setUnits(e.target.value)}
          inputMode="numeric"
          placeholder={`Cantidad (${label ?? "unidades"})`}
          className="min-h-touch w-full rounded-xl border border-line px-4 text-base"
        />
      </div>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Nota (opcional)"
        className="min-h-touch w-full rounded-xl border border-line px-4 text-base"
      />
      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={saving}>
          {saving ? "Guardando…" : "Añadir al inventario"}
        </Button>
        {msg ? <span className="text-sm text-status-late">{msg}</span> : null}
      </div>
      <p className="text-xs text-muted">
        Para corregir un conteo, escribe una cantidad negativa (ej. −5).
      </p>
    </div>
  );
}
