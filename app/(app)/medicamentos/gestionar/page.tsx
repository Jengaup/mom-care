import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getActivePatient } from "@/lib/patient";
import { createClient } from "@/lib/supabase/server";
import { loadStockFor } from "@/lib/inventory";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  MedManageList,
  type ManageMed,
} from "@/components/medications/MedManageList";

export const dynamic = "force-dynamic";

export default async function GestionarMedicamentosPage() {
  await requireRole("admin");
  const patient = await getActivePatient();
  if (!patient) {
    return <EmptyState title="No hay un paciente activo." />;
  }
  const supabase = await createClient();

  const { data: meds } = await supabase
    .from("patient_medications")
    .select(
      "id, name, dose, unit, is_active, track_stock, units_per_dose, stock_unit_label, low_stock_threshold",
    )
    .eq("patient_id", patient.id)
    .order("is_active", { ascending: false })
    .order("name");
  const medList = meds ?? [];
  const medIds = medList.map((m) => m.id);
  const stock = await loadStockFor(medList);

  const { data: scheds } = medIds.length
    ? await supabase
        .from("medication_schedules")
        .select("patient_medication_id, schedule_type, time_of_day, interval_hours")
        .in("patient_medication_id", medIds)
        .eq("is_active", true)
    : { data: [] };
  const freqByMed = new Map<string, string[]>();
  for (const s of scheds ?? []) {
    const label =
      s.schedule_type === "prn"
        ? "Según necesidad"
        : s.schedule_type === "interval"
          ? `Cada ${s.interval_hours} h`
          : (s.time_of_day ?? "").slice(0, 5);
    const arr = freqByMed.get(s.patient_medication_id) ?? [];
    arr.push(label);
    freqByMed.set(s.patient_medication_id, arr);
  }

  const items: ManageMed[] = medList.map((m) => {
    const s = stock.get(m.id);
    return {
      id: m.id,
      name: m.name,
      dose: m.dose,
      unit: m.unit,
      freq: (freqByMed.get(m.id) ?? []).join(", ") || "Sin horario",
      isActive: m.is_active,
      stock: s
        ? {
            remaining: s.remaining,
            label: s.label,
            isLow: s.isLow,
            dosesLeft: s.dosesLeft,
          }
        : null,
    };
  });

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-ink">
          Medicamentos
        </h1>
        <Link
          href="/medicamentos/nuevo"
          className="min-h-touch inline-flex items-center rounded-xl bg-brand px-4 font-semibold text-white"
        >
          + Nuevo
        </Link>
      </header>
      <MedManageList meds={items} />
    </div>
  );
}
