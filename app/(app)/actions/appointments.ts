"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";

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
