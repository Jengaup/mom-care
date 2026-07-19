import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

export type Patient = Tables<"patients">;

/**
 * Paciente activo del usuario. MVP monopaciente: RLS ya filtra a los pacientes
 * vinculados, así que tomamos el primero. `cache` evita repetir la query dentro
 * del mismo render de servidor.
 */
export const getActivePatient = cache(async (): Promise<Patient | null> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("patients")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data ?? null;
});
