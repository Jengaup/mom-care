"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { createAppointment } from "@/app/(app)/actions/appointments";

const field = "min-h-touch w-full rounded-xl border border-line px-4 text-base";

export function NewAppointmentForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [clinic, setClinic] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    if (!title.trim()) {
      setError("Escribe un título.");
      return;
    }
    if (!scheduledAt) {
      setError("Elige fecha y hora.");
      return;
    }
    setSaving(true);
    const res = await createAppointment({
      title,
      doctorName: doctorName || null,
      specialty: specialty || null,
      clinic: clinic || null,
      scheduledAtLocal: scheduledAt,
      address: address || null,
      phone: phone || null,
      notes: notes || null,
    });
    setSaving(false);
    if (res.ok) {
      router.push("/citas");
      router.refresh();
    } else {
      setError(res.message ?? "No se pudo guardar.");
    }
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Título (ej. Control de cardiología)"
          className={field}
        />
        <div>
          <label className="text-sm text-muted">Fecha y hora</label>
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            className={field}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input
            value={doctorName}
            onChange={(e) => setDoctorName(e.target.value)}
            placeholder="Doctor(a)"
            className={field}
          />
          <input
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
            placeholder="Especialidad"
            className={field}
          />
        </div>
        <input
          value={clinic}
          onChange={(e) => setClinic(e.target.value)}
          placeholder="Clínica / hospital"
          className={field}
        />
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Dirección"
          className={field}
        />
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Teléfono"
          inputMode="tel"
          className={field}
        />
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notas (opcional)"
          rows={2}
          className="w-full rounded-xl border border-line p-3 text-base"
        />
      </Card>

      {error ? <p className="text-sm text-status-late">{error}</p> : null}
      <Button className="w-full" onClick={save} disabled={saving}>
        {saving ? "Guardando…" : "Guardar cita"}
      </Button>
    </div>
  );
}
