import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { NewMedicationForm } from "@/components/medications/NewMedicationForm";

export const dynamic = "force-dynamic";

export default async function NuevoMedicamentoPage() {
  await requireRole("admin");

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-3">
        <Link href="/medicamentos" className="text-2xl" aria-label="Volver">
          ‹
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Nuevo medicamento</h1>
      </header>
      <NewMedicationForm />
    </div>
  );
}
