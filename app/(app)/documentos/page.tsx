import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { getActivePatient } from "@/lib/patient";
import { createClient } from "@/lib/supabase/server";
import { formatApp } from "@/lib/time";
import { EmptyState } from "@/components/ui/EmptyState";
import { AttachmentUpload } from "@/components/attachments/AttachmentUpload";
import {
  AttachmentItem,
  type AttachmentDTO,
} from "@/components/attachments/AttachmentItem";

export const dynamic = "force-dynamic";

const BUCKET = "attachments";

export default async function DocumentosPage() {
  const user = await getSessionUser();
  const patient = await getActivePatient();
  if (!patient) return <EmptyState title="No hay un paciente activo." />;
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("attachments")
    .select("id, storage_path, file_name, mime_type, note, uploaded_by, created_at")
    .eq("patient_id", patient.id)
    .order("created_at", { ascending: false })
    .limit(100);
  const list = rows ?? [];

  // Nombres de quienes subieron.
  const ids = Array.from(new Set(list.map((a) => a.uploaded_by)));
  const nameById = new Map<string, string>();
  if (ids.length) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", ids);
    for (const p of profs ?? []) nameById.set(p.id, p.full_name ?? "—");
  }

  // URLs firmadas (bucket privado). Una hora de validez.
  const paths = list.map((a) => a.storage_path);
  const urlByPath = new Map<string, string>();
  if (paths.length) {
    const { data: signed } = await supabase.storage
      .from(BUCKET)
      .createSignedUrls(paths, 3600);
    for (const s of signed ?? []) {
      if (s.signedUrl && s.path) urlByPath.set(s.path, s.signedUrl);
    }
  }

  const isAdmin = user?.role === "admin";
  const items: AttachmentDTO[] = list.map((a) => ({
    id: a.id,
    storagePath: a.storage_path,
    fileName: a.file_name,
    mimeType: a.mime_type,
    note: a.note,
    uploaderName: nameById.get(a.uploaded_by) ?? null,
    when: formatApp(a.created_at, "d MMM yyyy, h:mm a"),
    url: urlByPath.get(a.storage_path) ?? null,
    canDelete:
      isAdmin ||
      (a.uploaded_by === user?.id &&
        Date.now() - new Date(a.created_at).getTime() < 30 * 60 * 1000),
  }));

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-3">
        <Link href="/" className="text-2xl" aria-label="Volver">
          ‹
        </Link>
        <h1 className="font-display text-2xl font-semibold text-ink">
          Documentos y fotos
        </h1>
      </header>

      <AttachmentUpload patientId={patient.id} />

      {items.length === 0 ? (
        <EmptyState
          title="Aún no hay archivos"
          hint="Sube una receta, un resultado o una foto de la herida."
        />
      ) : (
        <div className="space-y-2">
          {items.map((a) => (
            <AttachmentItem key={a.id} a={a} />
          ))}
        </div>
      )}
    </div>
  );
}
