import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { getActivePatient } from "@/lib/patient";
import { loadTaskToday } from "@/lib/today";
import { groupTaskOccurrences } from "@/lib/dto";
import { EmptyState } from "@/components/ui/EmptyState";
import { TaskList } from "@/components/tasks/TaskList";

export const dynamic = "force-dynamic";

export default async function TareasPage() {
  const user = await getSessionUser();
  const patient = await getActivePatient();
  if (!patient) {
    return <EmptyState title="No hay un paciente asignado a tu cuenta." />;
  }

  const { occurrences } = await loadTaskToday(patient);
  const groups = groupTaskOccurrences(occurrences);

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-ink">Tareas</h1>
        {user?.role === "admin" ? (
          <Link
            href="/tareas/nuevo"
            className="min-h-touch inline-flex items-center rounded-xl bg-brand px-4 font-semibold text-white"
          >
            + Nuevo
          </Link>
        ) : null}
      </header>
      <TaskList groups={groups} />
    </div>
  );
}
