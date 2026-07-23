"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import {
  setActivePatient,
  createPatient,
  updatePatient,
} from "@/app/(app)/actions/patients";

type PatientLite = { id: string; full_name: string };

const field = "min-h-touch w-full rounded-xl border border-line px-4 text-base";

export function PatientsCard({
  patients,
  activeId,
  active,
  isAdmin,
}: {
  patients: PatientLite[];
  activeId: string;
  active: {
    id: string;
    full_name: string;
    birth_date: string | null;
    notes: string | null;
  };
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [switching, setSwitching] = useState<string | null>(null);

  // Editar activo
  const [editOpen, setEditOpen] = useState(false);
  const [eName, setEName] = useState(active.full_name);
  const [eBirth, setEBirth] = useState(active.birth_date ?? "");
  const [eNotes, setENotes] = useState(active.notes ?? "");

  // Crear
  const [createOpen, setCreateOpen] = useState(false);
  const [cName, setCName] = useState("");
  const [cBirth, setCBirth] = useState("");
  const [cNotes, setCNotes] = useState("");

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function switchTo(id: string) {
    if (id === activeId) return;
    setSwitching(id);
    await setActivePatient(id);
    router.refresh();
    setSwitching(null);
  }

  async function saveEdit() {
    setBusy(true);
    setMsg("");
    const res = await updatePatient({
      patientId: active.id,
      fullName: eName,
      birthDate: eBirth || null,
      notes: eNotes || null,
    });
    setBusy(false);
    setMsg(res.ok ? "Guardado" : res.message ?? "Error");
    if (res.ok) {
      setEditOpen(false);
      router.refresh();
    }
  }

  async function saveCreate() {
    setBusy(true);
    setMsg("");
    const res = await createPatient({
      fullName: cName,
      birthDate: cBirth || null,
      notes: cNotes || null,
    });
    setBusy(false);
    if (res.ok) {
      setCName("");
      setCBirth("");
      setCNotes("");
      setCreateOpen(false);
      router.refresh();
    } else {
      setMsg(res.message ?? "Error");
    }
  }

  return (
    <Card className="space-y-3">
      <CardTitle>Pacientes</CardTitle>

      <ul className="space-y-2">
        {patients.map((p) => {
          const isActive = p.id === activeId;
          return (
            <li key={p.id}>
              <button
                onClick={() => switchTo(p.id)}
                disabled={switching !== null}
                className={`min-h-touch flex w-full items-center justify-between rounded-xl border px-4 text-left text-base ${
                  isActive
                    ? "border-brand bg-brand-soft font-semibold text-brand-dark"
                    : "border-line text-ink"
                }`}
              >
                <span className="truncate">{p.full_name}</span>
                <span className="shrink-0 text-sm">
                  {isActive ? "Activo" : switching === p.id ? "…" : "Cambiar"}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {isAdmin ? (
        <div className="space-y-2 border-t border-line pt-3">
          {/* Editar activo */}
          {!editOpen ? (
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => {
                setEName(active.full_name);
                setEBirth(active.birth_date ?? "");
                setENotes(active.notes ?? "");
                setEditOpen(true);
                setCreateOpen(false);
              }}
            >
              Editar paciente activo
            </Button>
          ) : (
            <div className="space-y-2 rounded-xl bg-black/[0.03] p-3">
              <input
                value={eName}
                onChange={(e) => setEName(e.target.value)}
                placeholder="Nombre completo"
                className={field}
              />
              <label className="text-sm text-muted">Fecha de nacimiento</label>
              <input
                type="date"
                value={eBirth}
                onChange={(e) => setEBirth(e.target.value)}
                className={field}
              />
              <textarea
                value={eNotes}
                onChange={(e) => setENotes(e.target.value)}
                placeholder="Notas"
                rows={2}
                className="w-full rounded-xl border border-line p-3 text-base"
              />
              <div className="grid grid-cols-2 gap-2">
                <Button variant="secondary" onClick={() => setEditOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={saveEdit} disabled={busy}>
                  Guardar
                </Button>
              </div>
            </div>
          )}

          {/* Crear */}
          {!createOpen ? (
            <Button className="w-full" onClick={() => {
              setCreateOpen(true);
              setEditOpen(false);
            }}>
              + Crear paciente
            </Button>
          ) : (
            <div className="space-y-2 rounded-xl bg-black/[0.03] p-3">
              <input
                value={cName}
                onChange={(e) => setCName(e.target.value)}
                placeholder="Nombre del paciente"
                className={field}
              />
              <label className="text-sm text-muted">Fecha de nacimiento</label>
              <input
                type="date"
                value={cBirth}
                onChange={(e) => setCBirth(e.target.value)}
                className={field}
              />
              <textarea
                value={cNotes}
                onChange={(e) => setCNotes(e.target.value)}
                placeholder="Notas (alergias, condiciones…)"
                rows={2}
                className="w-full rounded-xl border border-line p-3 text-base"
              />
              <div className="grid grid-cols-2 gap-2">
                <Button variant="secondary" onClick={() => setCreateOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={saveCreate} disabled={busy}>
                  Crear y activar
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : null}

      {msg ? <p className="text-sm text-muted">{msg}</p> : null}
    </Card>
  );
}
