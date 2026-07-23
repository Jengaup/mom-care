"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { setTaskActive } from "@/app/(app)/actions/tasks";

export type ManageTask = {
  id: string;
  title: string;
  category: string | null;
  times: string;
  isActive: boolean;
};

export function TaskManageList({ tasks }: { tasks: ManageTask[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function toggle(t: ManageTask) {
    setBusy(t.id);
    await setTaskActive(t.id, !t.isActive);
    router.refresh();
    setBusy(null);
  }

  if (tasks.length === 0) {
    return <EmptyState title="No hay tareas" hint="Añade una con + Nuevo." />;
  }

  return (
    <div className="space-y-2">
      {tasks.map((t) => (
        <Card
          key={t.id}
          accent={t.isActive ? undefined : "inactive"}
          className="flex items-center gap-3"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold text-ink">{t.title}</p>
            <p className="text-sm text-muted">
              {t.category ? `${t.category} · ` : ""}
              {t.times}
              {t.isActive ? "" : " · inactiva"}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link href={`/tareas/${t.id}/editar`}>
              <Button variant="secondary">Editar</Button>
            </Link>
            <Button
              variant="ghost"
              className="px-3"
              disabled={busy === t.id}
              onClick={() => toggle(t)}
            >
              {t.isActive ? "Desactivar" : "Activar"}
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
