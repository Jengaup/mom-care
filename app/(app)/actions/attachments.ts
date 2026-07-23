"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { getActivePatient } from "@/lib/patient";

const BUCKET = "attachments";

/** Registra los metadatos de un archivo ya subido a Storage por el cliente. */
export async function recordAttachment(input: {
  storagePath: string;
  fileName: string;
  mimeType: string | null;
  note: string | null;
}): Promise<{ ok: boolean; message?: string }> {
  const user = await requireUser();
  const patient = await getActivePatient();
  if (!patient) return { ok: false, message: "No hay paciente activo." };
  // La ruta debe pertenecer a la carpeta del paciente activo.
  if (!input.storagePath.startsWith(`${patient.id}/`)) {
    return { ok: false, message: "Ruta no válida." };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("attachments").insert({
    patient_id: patient.id,
    storage_path: input.storagePath,
    file_name: input.fileName,
    mime_type: input.mimeType,
    note: input.note?.trim() || null,
    uploaded_by: user.id,
  });
  if (error) {
    // Si falló el registro, intenta limpiar el archivo huérfano.
    await supabase.storage.from(BUCKET).remove([input.storagePath]);
    return { ok: false, message: "No se pudo guardar." };
  }
  revalidatePath("/documentos");
  return { ok: true };
}

/** Borra un adjunto: primero el archivo, luego los metadatos (RLS decide si
 * el usuario puede). */
export async function deleteAttachment(
  id: string,
  storagePath: string,
): Promise<{ ok: boolean; message?: string }> {
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("attachments")
    .delete()
    .eq("id", id)
    .select("id");
  if (error) return { ok: false, message: "No se pudo borrar." };
  if (!data || data.length === 0) {
    return { ok: false, message: "No tienes permiso para borrarlo." };
  }
  await supabase.storage.from(BUCKET).remove([storagePath]);
  revalidatePath("/documentos");
  return { ok: true };
}
