import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { NewTaskForm } from "@/components/tasks/NewTaskForm";

export const dynamic = "force-dynamic";

export default async function NuevaTareaPage() {
  await requireRole("admin");

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-3">
        <Link href="/tareas" className="text-2xl" aria-label="Volver">
          ‹
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Nueva tarea</h1>
      </header>
      <NewTaskForm />
    </div>
  );
}
