import { getActivePatient } from "@/lib/patient";
import { loadTaskToday } from "@/lib/today";
import { groupTaskOccurrences } from "@/lib/dto";
import { EmptyState } from "@/components/ui/EmptyState";
import { TaskList } from "@/components/tasks/TaskList";

export const dynamic = "force-dynamic";

export default async function TareasPage() {
  const patient = await getActivePatient();
  if (!patient) {
    return <EmptyState title="No hay un paciente asignado a tu cuenta." />;
  }

  const { occurrences } = await loadTaskToday(patient);
  const groups = groupTaskOccurrences(occurrences);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Tareas</h1>
      <TaskList groups={groups} />
    </div>
  );
}
