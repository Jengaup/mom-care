import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  EditMedicationForm,
  type EditInitial,
} from "@/components/medications/EditMedicationForm";

export const dynamic = "force-dynamic";

export default async function EditarMedicamentoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("admin");
  const { id } = await params;
  const supabase = await createClient();

  const { data: med } = await supabase
    .from("patient_medications")
    .select(
      "id, name, dose, unit, instructions, is_active, prn_reason, prn_min_hours_between",
    )
    .eq("id", id)
    .maybeSingle();
  if (!med) notFound();

  const { data: scheds } = await supabase
    .from("medication_schedules")
    .select("schedule_type, time_of_day, days_of_week, interval_hours, anchor_time")
    .eq("patient_medication_id", id)
    .eq("is_active", true);

  const schedules = scheds ?? [];
  const hasPrn = schedules.some((s) => s.schedule_type === "prn");
  const hasInterval = schedules.some((s) => s.schedule_type === "interval");
  const scheduleType = hasPrn ? "prn" : hasInterval ? "interval" : "fixed";

  const fixed = schedules.filter((s) => s.schedule_type === "fixed");
  const fixedTimes = fixed
    .map((s) => (s.time_of_day ?? "").slice(0, 5))
    .filter(Boolean)
    .sort();
  const firstFixedDays = fixed[0]?.days_of_week ?? null;
  const interval = schedules.find((s) => s.schedule_type === "interval");

  const initial: EditInitial = {
    name: med.name,
    dose: med.dose != null ? String(med.dose) : "",
    unit: med.unit ?? "",
    instructions: med.instructions ?? "",
    isActive: med.is_active,
    scheduleType,
    fixedTimes: fixedTimes.length ? fixedTimes : ["08:00"],
    everyDay: !firstFixedDays || firstFixedDays.length === 0,
    days: firstFixedDays ?? [],
    intervalHours:
      interval?.interval_hours != null ? String(interval.interval_hours) : "8",
    anchorTime: interval?.anchor_time?.slice(0, 5) ?? "06:00",
    prnReason: med.prn_reason ?? "",
    prnMinHours:
      med.prn_min_hours_between != null
        ? String(med.prn_min_hours_between)
        : "6",
  };

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-3">
        <Link href="/medicamentos/gestionar" className="text-2xl" aria-label="Volver">
          ‹
        </Link>
        <h1 className="font-display text-2xl font-semibold text-ink">
          Editar medicamento
        </h1>
      </header>
      <EditMedicationForm medicationId={med.id} initial={initial} />
    </div>
  );
}
