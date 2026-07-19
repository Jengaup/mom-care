"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { getActivePatient } from "@/lib/patient";
import { todayInAppTz } from "@/lib/time";

/** Guarda la nota del día del usuario (una por autor y fecha). Autoguardado. */
export async function saveDailyNote(
  content: string,
): Promise<{ ok: boolean; message?: string }> {
  const user = await requireUser();
  const patient = await getActivePatient();
  if (!patient) return { ok: false, message: "No hay paciente activo." };
  const supabase = await createClient();
  const today = todayInAppTz();

  const { data: existing } = await supabase
    .from("daily_notes")
    .select("id")
    .eq("patient_id", patient.id)
    .eq("note_date", today)
    .eq("author_id", user.id)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("daily_notes")
      .update({ content })
      .eq("id", existing.id);
    if (error) return { ok: false, message: "No se pudo guardar." };
  } else {
    const { error } = await supabase.from("daily_notes").insert({
      patient_id: patient.id,
      note_date: today,
      content,
      author_id: user.id,
    });
    if (error) return { ok: false, message: "No se pudo guardar." };
  }

  revalidatePath("/notas");
  revalidatePath("/");
  return { ok: true };
}
