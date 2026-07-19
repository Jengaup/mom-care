import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { getActivePatient } from "@/lib/patient";
import { createClient } from "@/lib/supabase/server";
import { dayRangeUtc, formatApp, now, todayInAppTz } from "@/lib/time";
import {
  buildMedOccurrences,
  type MedInfo,
  type MedLogRow,
  type MedScheduleRow,
} from "@/lib/occurrences";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  MedicationList,
  type OccDTO,
  type OccGroup,
  type PrnDTO,
} from "@/components/medications/MedicationList";

export const dynamic = "force-dynamic";

export default async function MedicamentosPage() {
  const user = await getSessionUser();
  const patient = await getActivePatient();
  if (!patient) {
    return <EmptyState title="No hay un paciente asignado a tu cuenta." />;
  }

  const supabase = await createClient();
  const day = todayInAppTz();
  const { start, end } = dayRangeUtc(day);

  const { data: meds } = await supabase
    .from("patient_medications")
    .select(
      "id, name, dose, unit, instructions, prn_reason, prn_min_hours_between",
    )
    .eq("patient_id", patient.id)
    .eq("is_active", true);

  const medications: MedInfo[] = meds ?? [];
  const medIds = medications.map((m) => m.id);

  let schedules: MedScheduleRow[] = [];
  let logs: MedLogRow[] = [];
  if (medIds.length > 0) {
    const { data: sch } = await supabase
      .from("medication_schedules")
      .select(
        "id, patient_medication_id, schedule_type, time_of_day, days_of_week, interval_hours, anchor_time",
      )
      .in("patient_medication_id", medIds)
      .eq("is_active", true);
    schedules = sch ?? [];

    const { data: lg } = await supabase
      .from("medication_logs")
      .select(
        "id, patient_medication_id, schedule_id, scheduled_for, administered_at, status, postponed_to, note, recorded_by",
      )
      .in("patient_medication_id", medIds)
      .or(
        `and(scheduled_for.gte.${start.toISOString()},scheduled_for.lt.${end.toISOString()}),and(scheduled_for.is.null,administered_at.gte.${start.toISOString()},administered_at.lt.${end.toISOString()})`,
      );
    logs = lg ?? [];
  }

  const { occurrences, prn } = buildMedOccurrences({
    day,
    now: now(),
    graceMinutes: patient.grace_minutes,
    medications,
    schedules,
    logs,
  });

  // Agrupar por hora (AST), preservando el orden cronológico.
  const groupsMap = new Map<string, OccDTO[]>();
  for (const o of occurrences) {
    const timeLabel = formatApp(o.scheduledFor, "h:mm a");
    const dto: OccDTO = {
      key: `${o.medicationId}|${o.scheduledFor.toISOString()}`,
      medicationId: o.medicationId,
      scheduleId: o.scheduleId,
      name: o.name,
      dose: o.dose,
      unit: o.unit,
      instructions: o.instructions,
      scheduledForISO: o.scheduledFor.toISOString(),
      timeLabel,
      state: o.state,
      recordedByName: null,
    };
    const arr = groupsMap.get(timeLabel);
    if (arr) arr.push(dto);
    else groupsMap.set(timeLabel, [dto]);
  }
  const groups: OccGroup[] = Array.from(groupsMap.entries()).map(
    ([timeLabel, items]) => ({ timeLabel, items }),
  );

  const prnDtos: PrnDTO[] = prn.map((p) => ({
    medicationId: p.medication.id,
    scheduleId: p.scheduleId,
    name: p.medication.name,
    dose: p.medication.dose,
    unit: p.medication.unit,
    reason: p.medication.prn_reason,
    minHours: p.medication.prn_min_hours_between,
    lastDoseISO: p.lastDose?.administered_at ?? null,
    dosesToday: p.dosesToday,
  }));

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Medicamentos</h1>
        {user?.role === "admin" ? (
          <Link
            href="/medicamentos/nuevo"
            className="min-h-touch inline-flex items-center rounded-xl bg-status-done px-4 font-semibold text-white"
          >
            + Nuevo
          </Link>
        ) : null}
      </header>
      <MedicationList groups={groups} prn={prnDtos} />
    </div>
  );
}
