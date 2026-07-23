"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { setMedicationActive } from "@/app/(app)/actions/meds";

export type ManageMed = {
  id: string;
  name: string;
  dose: number | null;
  unit: string | null;
  freq: string;
  isActive: boolean;
};

export function MedManageList({ meds }: { meds: ManageMed[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

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
          className="flex items-center gap-3"
        >
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
        </Card>
      ))}
    </div>
  );
}
