"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { getActivePatient } from "@/lib/patient";
import { scheduledForUtc } from "@/lib/time";

/** Marca una cita como completada y guarda sus notas (spec pantalla 6). */
export async function completeAppointment(input: {
  appointmentId: string;
  summary?: string | null;
  nextSteps?: string | null;
  medicationChanges?: string | null;
  nextAppointmentAtISO?: string | null;
}): Promise<{ ok: boolean; message?: string }> {
  const user = await requireRole("admin");
  const supabase = await createClient();

  const { error: updErr } = await supabase
    .from("appointments")
    .update({ status: "completed" })
    .eq("id", input.appointmentId);
  if (updErr) return { ok: false, message: "No se pudo actualizar la cita." };

  const { error: noteErr } = await supabase.from("appointment_notes").insert({
    appointment_id: input.appointmentId,
    summary: input.summary?.trim() || null,
    next_steps: input.nextSteps?.trim() || null,
    medication_changes: input.medicationChanges?.trim() || null,
    next_appointment_at: input.nextAppointmentAtISO || null,
    created_by: user.id,
  });
  if (noteErr) return { ok: false, message: "No se pudieron guardar las notas." };

  revalidatePath("/citas");
  revalidatePath(`/citas/${input.appointmentId}`);
  revalidatePath("/");
  return { ok: true };
}

/** Crea una cita (admin). scheduledAtLocal viene de un input datetime-local
 * (hora de pared) y se interpreta en AST. */
export async function createAppointment(input: {
  title: string;
  doctorName: string | null;
  specialty: string | null;
  clinic: string | null;
  scheduledAtLocal: string;
  address: string | null;
  phone: string | null;
  notes: string | null;
}): Promise<{ ok: boolean; message?: string }> {
  const user = await requireRole("admin");
  const patient = await getActivePatient();
  if (!patient) return { ok: false, message: "No hay paciente activo." };
  if (!input.scheduledAtLocal) return { ok: false, message: "Falta la fecha." };
  const supabase = await createClient();

  const [d, t] = input.scheduledAtLocal.split("T");
  if (!d) return { ok: false, message: "Fecha inválida." };
  const scheduledAtISO = scheduledForUtc(d, t ?? "00:00").toISOString();

  const { error } = await supabase.from("appointments").insert({
    patient_id: patient.id,
    title: input.title.trim(),
    doctor_name: input.doctorName?.trim() || null,
    specialty: input.specialty?.trim() || null,
    clinic: input.clinic?.trim() || null,
    scheduled_at: scheduledAtISO,
    address: input.address?.trim() || null,
    phone: input.phone?.trim() || null,
    notes: input.notes?.trim() || null,
    status: "upcoming",
    created_by: user.id,
  });
  if (error) return { ok: false, message: "No se pudo crear la cita." };

  revalidatePath("/citas");
  revalidatePath("/");
  return { ok: true };
}

/** Reprograma una cita (admin): nueva fecha/hora, sigue como próxima. */
export async function rescheduleAppointment(input: {
  appointmentId: string;
  scheduledAtLocal: string;
}): Promise<{ ok: boolean; message?: string }> {
  await requireRole("admin");
  if (!input.scheduledAtLocal) return { ok: false, message: "Falta la fecha." };
  const supabase = await createClient();
  const [d, t] = input.scheduledAtLocal.split("T");
  if (!d) return { ok: false, message: "Fecha inválida." };
  const scheduledAtISO = scheduledForUtc(d, t ?? "00:00").toISOString();
  const { error } = await supabase
    .from("appointments")
    .update({ scheduled_at: scheduledAtISO, status: "upcoming" })
    .eq("id", input.appointmentId);
  if (error) return { ok: false, message: "No se pudo reprogramar." };
  revalidatePath("/citas");
  revalidatePath(`/citas/${input.appointmentId}`);
  revalidatePath("/");
  return { ok: true };
}

/** Cancela una cita (admin). */
export async function cancelAppointment(
  appointmentId: string,
): Promise<{ ok: boolean; message?: string }> {
  await requireRole("admin");
  const supabase = await createClient();
  const { error } = await supabase
    .from("appointments")
    .update({ status: "cancelled" })
    .eq("id", appointmentId);
  if (error) return { ok: false, message: "No se pudo cancelar." };
  revalidatePath("/citas");
  revalidatePath(`/citas/${appointmentId}`);
  revalidatePath("/");
  return { ok: true };
}
