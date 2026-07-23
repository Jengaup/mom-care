"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { deleteAttachment } from "@/app/(app)/actions/attachments";

export type AttachmentDTO = {
  id: string;
  storagePath: string;
  fileName: string;
  mimeType: string | null;
  note: string | null;
  uploaderName: string | null;
  when: string;
  url: string | null;
  canDelete: boolean;
};

export function AttachmentItem({ a }: { a: AttachmentDTO }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const isImage = (a.mimeType ?? "").startsWith("image/");

  async function remove() {
    if (!window.confirm("¿Borrar este archivo?")) return;
    setBusy(true);
    const res = await deleteAttachment(a.id, a.storagePath);
    setBusy(false);
    if (!res.ok && res.message) window.alert(res.message);
    router.refresh();
  }

  return (
    <Card className="space-y-2">
      {a.url && isImage ? (
        <a href={a.url} target="_blank" rel="noreferrer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={a.url}
            alt={a.note ?? a.fileName}
            className="max-h-64 w-full rounded-xl object-cover"
          />
        </a>
      ) : null}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-ink">
            {a.note || a.fileName}
          </p>
          <p className="text-sm text-muted">
            {a.when}
            {a.uploaderName ? ` · ${a.uploaderName}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {a.url ? (
            <a
              href={a.url}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-semibold text-brand-dark"
            >
              {isImage ? "Ver" : "Abrir"}
            </a>
          ) : null}
          {a.canDelete ? (
            <button
              onClick={remove}
              disabled={busy}
              className="text-sm font-semibold text-status-late"
            >
              Borrar
            </button>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
