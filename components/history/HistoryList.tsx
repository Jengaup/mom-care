"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { StatusBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import type { OccurrenceState } from "@/lib/status";
import { correctMedLog, type DoseStatus } from "@/app/(app)/actions/meds";
import { correctTaskLog, type TaskStatus } from "@/app/(app)/actions/tasks";

export type HistoryRow = {
  id: string;
  label: string;
  status: string;
  state: OccurrenceState;
  when: string;
  who: string;
};

const MED_OPTS: { value: DoseStatus; label: string }[] = [
  { value: "given", label: "Dado" },
  { value: "skipped", label: "Omitido" },
  { value: "postponed", label: "Pospuesto" },
];
const TASK_OPTS: { value: TaskStatus; label: string }[] = [
  { value: "done", label: "Hecho" },
  { value: "skipped", label: "Omitido" },
];

export function HistoryList({
  rows,
  tipo,
  isAdmin,
}: {
  rows: HistoryRow[];
  tipo: "med" | "task";
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<HistoryRow | null>(null);
  const [busy, setBusy] = useState(false);

  async function correct(newStatus: string) {
    if (!editing) return;
    setBusy(true);
    if (tipo === "med") {
      await correctMedLog(editing.id, newStatus as DoseStatus);
    } else {
      await correctTaskLog(editing.id, newStatus as TaskStatus);
    }
    setBusy(false);
    setEditing(null);
    router.refresh();
  }

  if (rows.length === 0) {
    return <EmptyState title="No hay registros con estos filtros" />;
  }

  return (
    <>
      <Card className="divide-y divide-line p-0">
        {rows.map((r) => (
          <div key={r.id} className="flex items-center justify-between gap-2 p-3">
            <div className="min-w-0">
              <p className="truncate text-base text-ink">{r.label}</p>
              <p className="text-sm text-muted">
                {r.when} · {r.who}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <StatusBadge
                state={r.state}
                label={
                  r.state === "given" && tipo === "task" ? "Hecho" : undefined
                }
              />
              {isAdmin ? (
                <button
                  onClick={() => setEditing(r)}
                  className="min-h-touch px-1 text-sm font-semibold text-brand-dark"
                >
                  Corregir
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </Card>

      <Sheet
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing ? `Corregir · ${editing.label}` : undefined}
      >
        <div className="space-y-2">
          <p className="text-sm text-muted">
            Elige el estado correcto. Queda registrado como corrección.
          </p>
          {(tipo === "med" ? MED_OPTS : TASK_OPTS).map((o) => (
            <Button
              key={o.value}
              variant="secondary"
              className="w-full justify-start"
              disabled={busy}
              onClick={() => correct(o.value)}
            >
              {o.label}
            </Button>
          ))}
        </div>
      </Sheet>
    </>
  );
}
