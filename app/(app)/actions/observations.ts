"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { getActivePatient } from "@/lib/patient";
import type { ObsType } from "@/lib/observations";

/** Registra un signo/observación del paciente activo. */
export async function recordObservation(input: {
  type: ObsType;
  valueNum: number | null;
  valueText: string | null;
  unit: string | null;
  note: string | null;
}): Promise<{ ok: boolean; message?: string }> {
  const user = await requireUser();
  const patient = await getActivePatient();
  if (!patient) return { ok: false, message: "No hay paciente activo." };
  const supabase = await createClient();

  const { error } = await supabase.from("observations").insert({
    patient_id: patient.id,
    type: input.type,
    value_num: input.valueNum,
    value_text: input.valueText?.trim() || null,
    unit: input.unit,
    note: input.note?.trim() || null,
    recorded_by: user.id,
  });
  if (error) return { ok: false, message: "No se pudo registrar." };

  revalidatePath("/signos");
  revalidatePath("/");
  return { ok: true };
}
