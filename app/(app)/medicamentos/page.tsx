import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { getActivePatient } from "@/lib/patient";
import { loadMedicationToday } from "@/lib/today";
import { groupMedOccurrences, toPrnDtos } from "@/lib/dto";
import { EmptyState } from "@/components/ui/EmptyState";
import { MedicationList } from "@/components/medications/MedicationList";

export const dynamic = "force-dynamic";

export default async function MedicamentosPage() {
  const user = await getSessionUser();
  const patient = await getActivePatient();
  if (!patient) {
    return <EmptyState title="No hay un paciente asignado a tu cuenta." />;
  }

  const { occurrences, prn } = await loadMedicationToday(patient);
  const groups = groupMedOccurrences(occurrences);
  const prnDtos = toPrnDtos(prn);

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-ink">Medicamentos</h1>
        {user?.role === "admin" ? (
          <div className="flex items-center gap-2">
            <Link
              href="/medicamentos/gestionar"
              className="min-h-touch inline-flex items-center rounded-xl border border-line bg-surface px-3 font-semibold text-ink"
            >
              Editar
            </Link>
            <Link
              href="/medicamentos/nuevo"
              className="min-h-touch inline-flex items-center rounded-xl bg-brand px-4 font-semibold text-white"
            >
              + Nuevo
            </Link>
          </div>
        ) : null}
      </header>
      <MedicationList groups={groups} prn={prnDtos} />
    </div>
  );
}
