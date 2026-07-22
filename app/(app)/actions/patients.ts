"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { ACTIVE_PATIENT_COOKIE } from "@/lib/patient";

const COOKIE_OPTS = {
  path: "/",
  httpOnly: true,
  sameSite: "lax" as const,
  maxAge: 60 * 60 * 24 * 365,
};

/** Cambia el paciente activo (guardado en cookie). Solo si el usuario tiene acceso. */
export async function setActivePatient(
  patientId: string,
): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("patients")
    .select("id")
    .eq("id", patientId)
    .maybeSingle();
  if (!data) return { ok: false }; // RLS: sin acceso, no se cambia

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_PATIENT_COOKIE, patientId, COOKIE_OPTS);
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Crea un paciente (admin), vincula al creador y lo deja como activo. */
export async function createPatient(input: {
  fullName: string;
  birthDate: string | null;
  notes: string | null;
  graceMinutes?: number;
}): Promise<{ ok: boolean; message?: string }> {
  const user = await requireRole("admin");
  const supabase = await createClient();

  if (!input.fullName.trim()) {
    return { ok: false, message: "Escribe el nombre del paciente." };
  }

  // Id generado en el servidor: evita depender del RETURNING, que la política
  // de SELECT filtraría (aún no existe el vínculo con el paciente nuevo).
  const patientId = crypto.randomUUID();

  const { error } = await supabase.from("patients").insert({
    id: patientId,
    full_name: input.fullName.trim(),
    birth_date: input.birthDate || null,
    notes: input.notes?.trim() || null,
    grace_minutes: input.graceMinutes ?? 60,
  });
  if (error) return { ok: false, message: "No se pudo crear." };

  const { error: linkErr } = await supabase
    .from("caregiver_patients")
    .insert({ profile_id: user.id, patient_id: patientId });
  if (linkErr) {
    return { ok: false, message: "Creado, pero no se pudo vincular tu cuenta." };
  }

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_PATIENT_COOKIE, patientId, COOKIE_OPTS);
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Actualiza los datos del paciente activo (admin). */
export async function updatePatient(input: {
  patientId: string;
  fullName: string;
  birthDate: string | null;
  notes: string | null;
}): Promise<{ ok: boolean; message?: string }> {
  await requireRole("admin");
  const supabase = await createClient();
  const { error } = await supabase
    .from("patients")
    .update({
      full_name: input.fullName.trim(),
      birth_date: input.birthDate || null,
      notes: input.notes?.trim() || null,
    })
    .eq("id", input.patientId);
  if (error) return { ok: false, message: "No se pudo actualizar." };
  revalidatePath("/", "layout");
  return { ok: true };
}
