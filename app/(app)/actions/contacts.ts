"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { getActivePatient } from "@/lib/patient";

export type ContactInput = {
  name: string;
  role: string | null;
  phone: string | null;
  note: string | null;
  isEmergency: boolean;
};

/** Crea un contacto del paciente activo (admin). */
export async function createContact(
  input: ContactInput,
): Promise<{ ok: boolean; message?: string }> {
  const user = await requireRole("admin");
  const patient = await getActivePatient();
  if (!patient) return { ok: false, message: "No hay paciente activo." };
  if (!input.name.trim()) return { ok: false, message: "Escribe un nombre." };
  const supabase = await createClient();
  const { error } = await supabase.from("contacts").insert({
    patient_id: patient.id,
    name: input.name.trim(),
    role: input.role?.trim() || null,
    phone: input.phone?.trim() || null,
    note: input.note?.trim() || null,
    is_emergency: input.isEmergency,
    created_by: user.id,
  });
  if (error) return { ok: false, message: "No se pudo guardar." };
  revalidatePath("/contactos");
  return { ok: true };
}

/** Edita un contacto (admin). */
export async function updateContact(
  id: string,
  input: ContactInput,
): Promise<{ ok: boolean; message?: string }> {
  await requireRole("admin");
  if (!input.name.trim()) return { ok: false, message: "Escribe un nombre." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("contacts")
    .update({
      name: input.name.trim(),
      role: input.role?.trim() || null,
      phone: input.phone?.trim() || null,
      note: input.note?.trim() || null,
      is_emergency: input.isEmergency,
    })
    .eq("id", id);
  if (error) return { ok: false, message: "No se pudo actualizar." };
  revalidatePath("/contactos");
  return { ok: true };
}

/** Borra un contacto (admin). */
export async function deleteContact(id: string): Promise<{ ok: boolean }> {
  await requireRole("admin");
  const supabase = await createClient();
  const { error } = await supabase.from("contacts").delete().eq("id", id);
  if (error) return { ok: false };
  revalidatePath("/contactos");
  return { ok: true };
}

export type EmergencyInfoInput = {
  bloodType: string | null;
  allergies: string | null;
  conditions: string | null;
  insurance: string | null;
  emergencyNote: string | null;
};

/** Actualiza la información clave/de emergencia del paciente activo (admin). */
export async function updateEmergencyInfo(
  input: EmergencyInfoInput,
): Promise<{ ok: boolean; message?: string }> {
  await requireRole("admin");
  const patient = await getActivePatient();
  if (!patient) return { ok: false, message: "No hay paciente activo." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("patients")
    .update({
      blood_type: input.bloodType?.trim() || null,
      allergies: input.allergies?.trim() || null,
      conditions: input.conditions?.trim() || null,
      insurance: input.insurance?.trim() || null,
      emergency_note: input.emergencyNote?.trim() || null,
    })
    .eq("id", patient.id);
  if (error) return { ok: false, message: "No se pudo guardar." };
  revalidatePath("/contactos");
  return { ok: true };
}
