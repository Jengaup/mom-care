"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireRole, requireUser } from "@/lib/auth";
import { getActivePatient } from "@/lib/patient";

export async function updateMyProfile(input: {
  fullName: string;
  phone: string | null;
}): Promise<{ ok: boolean; message?: string }> {
  const user = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: input.fullName.trim(), phone: input.phone?.trim() || null })
    .eq("id", user.id);
  if (error) return { ok: false, message: "No se pudo actualizar." };
  revalidatePath("/configuracion");
  revalidatePath("/");
  return { ok: true };
}

export async function updateGraceMinutes(
  minutes: number,
): Promise<{ ok: boolean; message?: string; value?: number }> {
  await requireRole("admin");
  const patient = await getActivePatient();
  if (!patient) return { ok: false, message: "No hay paciente activo." };
  const supabase = await createClient();
  const value = Math.max(0, Math.round(minutes));
  const { error } = await supabase
    .from("patients")
    .update({ grace_minutes: value })
    .eq("id", patient.id);
  if (error) return { ok: false, message: "No se pudo actualizar." };
  revalidatePath("/", "layout");
  return { ok: true, value };
}

export async function updateCaregiverRole(input: {
  profileId: string;
  role: "admin" | "caregiver";
}): Promise<{ ok: boolean; message?: string }> {
  await requireRole("admin");
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ role: input.role })
    .eq("id", input.profileId);
  if (error) return { ok: false, message: "No se pudo cambiar el rol." };
  revalidatePath("/configuracion");
  return { ok: true };
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

/** Quita el vínculo de un cuidador con el paciente activo (admin). */
export async function removeCaregiver(
  profileId: string,
): Promise<{ ok: boolean; message?: string }> {
  const user = await requireRole("admin");
  if (profileId === user.id) {
    return { ok: false, message: "No puedes quitarte a ti mismo." };
  }
  const patient = await getActivePatient();
  if (!patient) return { ok: false, message: "No hay paciente activo." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("caregiver_patients")
    .delete()
    .eq("profile_id", profileId)
    .eq("patient_id", patient.id);
  if (error) return { ok: false, message: "No se pudo quitar." };
  revalidatePath("/configuracion");
  return { ok: true };
}
