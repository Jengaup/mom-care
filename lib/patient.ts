import { cache } from "react";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

export type Patient = Tables<"patients">;

export const ACTIVE_PATIENT_COOKIE = "active_patient";

/**
 * Paciente activo del usuario. Multi-paciente: se toma de la cookie de selección
 * si el usuario tiene acceso (RLS lo garantiza); si no, el primero vinculado.
 * `cache` evita repetir la query dentro del mismo render de servidor.
 */
export const getActivePatient = cache(async (): Promise<Patient | null> => {
  const supabase = await createClient();
  const cookieStore = await cookies();
  const selected = cookieStore.get(ACTIVE_PATIENT_COOKIE)?.value;

  if (selected) {
    const { data } = await supabase
      .from("patients")
      .select("*")
      .eq("id", selected)
      .maybeSingle();
    if (data) return data; // RLS ya filtró: si no hay acceso, data es null
  }

  const { data } = await supabase
    .from("patients")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data ?? null;
});

/** Pacientes a los que el usuario está vinculado (RLS filtra automáticamente). */
export async function getLinkedPatients(): Promise<
  Pick<Patient, "id" | "full_name">[]
> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("patients")
    .select("id, full_name")
    .order("created_at", { ascending: true });
  return data ?? [];
}
