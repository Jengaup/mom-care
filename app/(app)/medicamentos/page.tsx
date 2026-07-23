import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { getActivePatient } from "@/lib/patient";
import { loadMedicationToday } from "@/lib/today";
import { groupMedOccurrences, toPrnDtos } from "@/lib/dto";
import { createClient } from "@/lib/supabase/server";
import { loadStockFor } from "@/lib/inventory";
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

  // Aviso de inventario bajo (visible para todos los cuidadores).
  const supabase = await createClient();
  const { data: trackedMeds } = await supabase
    .from("patient_medications")
    .select(
      "id, name, track_stock, units_per_dose, stock_unit_label, low_stock_threshold",
    )
    .eq("patient_id", patient.id)
    .eq("is_active", true)
    .eq("track_stock", true);
  const stock = await loadStockFor(trackedMeds ?? []);
  const lowStock = (trackedMeds ?? [])
    .map((m) => ({ name: m.name, s: stock.get(m.id) }))
    .filter((x) => x.s?.isLow);

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
      {lowStock.length > 0 ? (
        <div className="rounded-2xl border border-status-late/30 bg-status-late/10 p-3">
          <p className="text-sm font-semibold text-status-late">
            ⚠ Inventario bajo
          </p>
          <ul className="mt-1 space-y-0.5 text-sm text-ink">
            {lowStock.map((x) => (
              <li key={x.name}>
                {x.name}: quedan {x.s!.remaining}
                {x.s!.label ? ` ${x.s!.label}` : " uds."}
              </li>
            ))}
          </ul>
          {user?.role === "admin" ? (
            <Link
              href="/medicamentos/gestionar"
              className="mt-1 inline-block text-sm font-semibold text-brand-dark"
            >
              Reabastecer →
            </Link>
          ) : (
            <p className="mt-1 text-sm text-muted">
              Avisa al administrador para reabastecer.
            </p>
          )}
        </div>
      ) : null}
      <MedicationList groups={groups} prn={prnDtos} />
    </div>
  );
}
