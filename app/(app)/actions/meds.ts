"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole, requireUser } from "@/lib/auth";
import { getActivePatient } from "@/lib/patient";
import type { TablesInsert } from "@/types/database";

export type DoseStatus = "given" | "skipped" | "postponed";

export type RecordDoseResult =
  | { ok: true }
  | {
      ok: false;
      conflict: true;
      recordedByName: string | null;
      administeredAt: string | null;
      status: DoseStatus;
    }
  | { ok: false; conflict: false; message: string };

async function recorderName(
  supabase: Awaited<ReturnType<typeof createClient>>,
  id: string | null,
): Promise<string | null> {
  if (!id) return null;
  const { data } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", id)
    .maybeSingle();
  return data?.full_name ?? null;
}

/** Registra una dosis programada (fixed/interval). Anti-doble-dosis por índice
 * único parcial: si otro cuidador ya la registró, devuelve quién y cuándo. */
export async function recordDose(input: {
  patientMedicationId: string;
  scheduleId: string;
  scheduledForISO: string;
  status: DoseStatus;
  note?: string | null;
  postponedToISO?: string | null;
}): Promise<RecordDoseResult> {
  const user = await requireUser();
  const supabase = await createClient();
  const nowISO = new Date().toISOString();

  const { error } = await supabase.from("medication_logs").insert({
    patient_medication_id: input.patientMedicationId,
    schedule_id: input.scheduleId,
    scheduled_for: input.scheduledForISO,
    administered_at: input.status === "given" ? nowISO : null,
    status: input.status,
    postponed_to:
      input.status === "postponed" ? input.postponedToISO ?? null : null,
    note: input.note ?? null,
    recorded_by: user.id,
  });

  if (error) {
    if (error.code === "23505") {
      const { data: existing } = await supabase
        .from("medication_logs")
        .select("status, administered_at, recorded_by")
        .eq("patient_medication_id", input.patientMedicationId)
        .eq("scheduled_for", input.scheduledForISO)
        .maybeSingle();
      return {
        ok: false,
        conflict: true,
        recordedByName: await recorderName(supabase, existing?.recorded_by ?? null),
        administeredAt: existing?.administered_at ?? null,
        status: (existing?.status as DoseStatus) ?? input.status,
      };
    }
    return { ok: false, conflict: false, message: "No se pudo registrar." };
  }

  revalidatePath("/medicamentos");
  revalidatePath("/");
  return { ok: true };
}

export type RecordPrnResult =
  | { ok: true }
  | {
      ok: false;
      needsConfirm: true;
      lastAt: string;
      lastByName: string | null;
      minHours: number;
    }
  | { ok: false; needsConfirm: false; message: string };

/** Registra una dosis PRN. Si no ha pasado el mínimo entre dosis, exige una
 * segunda confirmación (no lo bloquea del todo — spec 3.2). */
export async function recordPrn(input: {
  patientMedicationId: string;
  scheduleId: string;
  note?: string | null;
  override?: boolean;
}): Promise<RecordPrnResult> {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: med } = await supabase
    .from("patient_medications")
    .select("prn_min_hours_between")
    .eq("id", input.patientMedicationId)
    .maybeSingle();
  const minHours = med?.prn_min_hours_between ?? null;

  if (minHours && !input.override) {
    const { data: last } = await supabase
      .from("medication_logs")
      .select("administered_at, recorded_by")
      .eq("patient_medication_id", input.patientMedicationId)
      .is("scheduled_for", null)
      .not("administered_at", "is", null)
      .order("administered_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (last?.administered_at) {
      const hoursSince =
        (Date.now() - new Date(last.administered_at).getTime()) / 3_600_000;
      if (hoursSince < minHours) {
        return {
          ok: false,
          needsConfirm: true,
          lastAt: last.administered_at,
          lastByName: await recorderName(supabase, last.recorded_by),
          minHours,
        };
      }
    }
  }

  const { error } = await supabase.from("medication_logs").insert({
    patient_medication_id: input.patientMedicationId,
    schedule_id: input.scheduleId,
    scheduled_for: null,
    administered_at: new Date().toISOString(),
    status: "given",
    note: input.note ?? null,
    recorded_by: user.id,
  });
  if (error) return { ok: false, needsConfirm: false, message: "No se pudo registrar." };

  revalidatePath("/medicamentos");
  revalidatePath("/");
  return { ok: true };
}

// ── Catálogo + alta (admin) ──────────────────────────────────────────────────

export async function searchCatalog(query: string) {
  await requireUser();
  const supabase = await createClient();
  const q = query.trim();

  // Búsqueda insensible a acentos vía RPC (migración 0007).
  const { data, error } = await supabase.rpc("search_medication_catalog", { q });
  if (!error && data) {
    return data.map((d) => ({
      id: d.id,
      name: d.name,
      default_unit: d.default_unit,
    }));
  }

  // Fallback si la función aún no existe en la BD (sensible a acentos).
  let builder = supabase
    .from("medication_catalog")
    .select("id, name, default_unit")
    .order("name", { ascending: true })
    .limit(30);
  if (q) builder = builder.ilike("name", `%${q}%`);
  const { data: rows } = await builder;
  return rows ?? [];
}

export async function createCatalogEntry(name: string, unit: string | null) {
  const user = await requireRole("admin");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("medication_catalog")
    .insert({
      name: name.trim(),
      default_unit: unit?.trim() || null,
      is_custom: true,
      created_by: user.id,
    })
    .select("id, name, default_unit")
    .single();
  if (error || !data) return null;
  return data;
}

export type NewMedicationInput = {
  catalogId: string | null;
  name: string;
  dose: number | null;
  unit: string | null;
  instructions: string | null;
  scheduleType: "fixed" | "interval" | "prn";
  fixedTimes?: string[];
  daysOfWeek?: number[] | null;
  intervalHours?: number | null;
  anchorTime?: string | null;
  prnReason?: string | null;
  prnMinHours?: number | null;
};

export async function createMedication(
  input: NewMedicationInput,
): Promise<{ ok: boolean; message?: string }> {
  const user = await requireRole("admin");
  const patient = await getActivePatient();
  if (!patient) return { ok: false, message: "No hay paciente activo." };
  const supabase = await createClient();

  const isPrn = input.scheduleType === "prn";
  const { data: med, error: medErr } = await supabase
    .from("patient_medications")
    .insert({
      patient_id: patient.id,
      catalog_id: input.catalogId,
      name: input.name.trim(),
      dose: input.dose,
      unit: input.unit,
      instructions: input.instructions?.trim() || null,
      prn_reason: isPrn ? input.prnReason?.trim() || null : null,
      prn_min_hours_between: isPrn ? input.prnMinHours ?? null : null,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (medErr || !med) return { ok: false, message: "No se pudo crear el medicamento." };

  const scheduleRows = scheduleRowsFor(med.id, input);
  if (scheduleRows.length === 0) {
    return { ok: false, message: "Añade al menos una hora." };
  }

  const { error: schedErr } = await supabase
    .from("medication_schedules")
    .insert(scheduleRows);
  if (schedErr) return { ok: false, message: "No se pudo crear el horario." };

  revalidatePath("/medicamentos");
  revalidatePath("/medicamentos/gestionar");
  return { ok: true };
}

type FreqInput = {
  scheduleType: "fixed" | "interval" | "prn";
  fixedTimes?: string[];
  daysOfWeek?: number[] | null;
  intervalHours?: number | null;
  anchorTime?: string | null;
};

/** Construye las filas de medication_schedules para un tipo de frecuencia. */
function scheduleRowsFor(
  medId: string,
  f: FreqInput,
): TablesInsert<"medication_schedules">[] {
  const rows: TablesInsert<"medication_schedules">[] = [];
  if (f.scheduleType === "fixed") {
    for (const t of f.fixedTimes ?? []) {
      if (!t) continue;
      rows.push({
        patient_medication_id: medId,
        schedule_type: "fixed",
        time_of_day: t,
        days_of_week: f.daysOfWeek ?? null,
      });
    }
  } else if (f.scheduleType === "interval") {
    rows.push({
      patient_medication_id: medId,
      schedule_type: "interval",
      interval_hours: f.intervalHours,
      anchor_time: f.anchorTime,
    });
  } else {
    rows.push({ patient_medication_id: medId, schedule_type: "prn" });
  }
  return rows;
}

export type EditMedicationInput = {
  medicationId: string;
  name: string;
  dose: number | null;
  unit: string | null;
  instructions: string | null;
  isActive: boolean;
  scheduleType: "fixed" | "interval" | "prn";
  fixedTimes?: string[];
  daysOfWeek?: number[] | null;
  intervalHours?: number | null;
  anchorTime?: string | null;
  prnReason?: string | null;
  prnMinHours?: number | null;
};

/** Edita un medicamento (admin): datos + reemplaza sus horarios. */
export async function updateMedication(
  input: EditMedicationInput,
): Promise<{ ok: boolean; message?: string }> {
  await requireRole("admin");
  const supabase = await createClient();
  const isPrn = input.scheduleType === "prn";

  const { error: medErr } = await supabase
    .from("patient_medications")
    .update({
      name: input.name.trim(),
      dose: input.dose,
      unit: input.unit,
      instructions: input.instructions?.trim() || null,
      is_active: input.isActive,
      prn_reason: isPrn ? input.prnReason?.trim() || null : null,
      prn_min_hours_between: isPrn ? input.prnMinHours ?? null : null,
    })
    .eq("id", input.medicationId);
  if (medErr) return { ok: false, message: "No se pudo actualizar el medicamento." };

  // Reemplaza horarios: desactiva los actuales e inserta los nuevos.
  // (Sin DELETE por diseño; los logs previos quedan como historial.)
  await supabase
    .from("medication_schedules")
    .update({ is_active: false })
    .eq("patient_medication_id", input.medicationId);

  const rows = scheduleRowsFor(input.medicationId, input);
  if (rows.length === 0) return { ok: false, message: "Añade al menos una hora." };
  const { error: schedErr } = await supabase
    .from("medication_schedules")
    .insert(rows);
  if (schedErr) return { ok: false, message: "No se pudo guardar el horario." };

  revalidatePath("/medicamentos");
  revalidatePath("/medicamentos/gestionar");
  revalidatePath("/");
  return { ok: true };
}

/** Activa o desactiva un medicamento (admin). */
export async function setMedicationActive(
  medicationId: string,
  active: boolean,
): Promise<{ ok: boolean }> {
  await requireRole("admin");
  const supabase = await createClient();
  const { error } = await supabase
    .from("patient_medications")
    .update({ is_active: active })
    .eq("id", medicationId);
  if (error) return { ok: false };
  revalidatePath("/medicamentos");
  revalidatePath("/medicamentos/gestionar");
  revalidatePath("/");
  return { ok: true };
}

/** Corrige el estado de un registro de medicamento (solo admin, spec 3.6). */
export async function correctMedLog(
  logId: string,
  newStatus: DoseStatus,
): Promise<{ ok: boolean; message?: string }> {
  const user = await requireRole("admin");
  const supabase = await createClient();
  const { data: cur } = await supabase
    .from("medication_logs")
    .select("status")
    .eq("id", logId)
    .maybeSingle();
  if (!cur) return { ok: false, message: "Registro no encontrado." };

  const { error } = await supabase
    .from("medication_logs")
    .update({
      status: newStatus,
      administered_at: newStatus === "given" ? new Date().toISOString() : null,
      previous_status: cur.status,
      corrected_by: user.id,
      corrected_at: new Date().toISOString(),
    })
    .eq("id", logId);
  if (error) return { ok: false, message: "No se pudo corregir." };
  revalidatePath("/historial");
  revalidatePath("/medicamentos");
  revalidatePath("/");
  return { ok: true };
}
