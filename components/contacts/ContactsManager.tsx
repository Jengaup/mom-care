"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  createContact,
  updateContact,
  deleteContact,
  updateEmergencyInfo,
  type ContactInput,
} from "@/app/(app)/actions/contacts";

export type Contact = {
  id: string;
  name: string;
  role: string | null;
  phone: string | null;
  note: string | null;
  is_emergency: boolean;
};

export type EmergencyInfo = {
  bloodType: string | null;
  allergies: string | null;
  conditions: string | null;
  insurance: string | null;
  emergencyNote: string | null;
};

const field = "min-h-touch w-full rounded-xl border border-line px-4 text-base";

export function ContactsManager({
  contacts,
  info,
  isAdmin,
}: {
  contacts: Contact[];
  info: EmergencyInfo;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<Contact | "new" | null>(null);
  const [editInfo, setEditInfo] = useState(false);

  const emergency = contacts.filter((c) => c.is_emergency);
  const others = contacts.filter((c) => !c.is_emergency);
  const hasInfo =
    info.bloodType ||
    info.allergies ||
    info.conditions ||
    info.insurance ||
    info.emergencyNote;

  return (
    <div className="space-y-4">
      {/* Contactos de emergencia (primero, prominentes) */}
      <section className="space-y-2">
        <h2 className="px-1 text-sm font-bold uppercase tracking-wide text-status-late">
          Emergencia
        </h2>
        {emergency.length === 0 ? (
          <EmptyState title="Sin contactos de emergencia" />
        ) : (
          <div className="space-y-2">
            {emergency.map((c) => (
              <ContactCard
                key={c.id}
                c={c}
                isAdmin={isAdmin}
                onEdit={() => setEditing(c)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Información clave */}
      <section className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted">
            Información clave
          </h2>
          {isAdmin ? (
            <button
              onClick={() => setEditInfo(true)}
              className="text-sm font-semibold text-brand-dark"
            >
              Editar
            </button>
          ) : null}
        </div>
        <Card className="space-y-1.5">
          {hasInfo ? (
            <>
              <InfoRow label="Tipo de sangre" value={info.bloodType} />
              <InfoRow label="Alergias" value={info.allergies} />
              <InfoRow label="Condiciones" value={info.conditions} />
              <InfoRow label="Seguro" value={info.insurance} />
              <InfoRow label="Nota" value={info.emergencyNote} />
            </>
          ) : (
            <p className="text-muted">
              {isAdmin
                ? "Añade tipo de sangre, alergias, seguro y más."
                : "Aún no hay información registrada."}
            </p>
          )}
        </Card>
      </section>

      {/* Otros contactos */}
      <section className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted">
            Contactos
          </h2>
          {isAdmin ? (
            <button
              onClick={() => setEditing("new")}
              className="text-sm font-semibold text-brand-dark"
            >
              + Añadir
            </button>
          ) : null}
        </div>
        {others.length === 0 ? (
          <EmptyState title="Sin contactos" />
        ) : (
          <div className="space-y-2">
            {others.map((c) => (
              <ContactCard
                key={c.id}
                c={c}
                isAdmin={isAdmin}
                onEdit={() => setEditing(c)}
              />
            ))}
          </div>
        )}
      </section>

      {editing ? (
        <ContactForm
          initial={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      ) : null}

      {editInfo ? (
        <InfoForm
          info={info}
          onClose={() => setEditInfo(false)}
          onSaved={() => {
            setEditInfo(false);
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex gap-2">
      <span className="w-32 shrink-0 text-sm text-muted">{label}</span>
      <span className="text-base text-ink">{value}</span>
    </div>
  );
}

function ContactCard({
  c,
  isAdmin,
  onEdit,
}: {
  c: Contact;
  isAdmin: boolean;
  onEdit: () => void;
}) {
  return (
    <Card className="flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-semibold text-ink">
          {c.name}
          {c.role ? <span className="font-normal text-muted"> · {c.role}</span> : null}
        </p>
        {c.phone ? (
          <a
            href={`tel:${c.phone.replace(/[^0-9+]/g, "")}`}
            className="text-base font-semibold text-brand-dark"
          >
            {c.phone}
          </a>
        ) : null}
        {c.note ? <p className="text-sm text-muted">{c.note}</p> : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {c.phone ? (
          <a href={`tel:${c.phone.replace(/[^0-9+]/g, "")}`}>
            <Button className="px-4">Llamar</Button>
          </a>
        ) : null}
        {isAdmin ? (
          <Button variant="ghost" className="px-3" onClick={onEdit}>
            Editar
          </Button>
        ) : null}
      </div>
    </Card>
  );
}

function ContactForm({
  initial,
  onClose,
  onSaved,
}: {
  initial: Contact | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [role, setRole] = useState(initial?.role ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [note, setNote] = useState(initial?.note ?? "");
  const [isEmergency, setIsEmergency] = useState(initial?.is_emergency ?? false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  async function save() {
    setMsg("");
    setSaving(true);
    const payload: ContactInput = {
      name,
      role: role || null,
      phone: phone || null,
      note: note || null,
      isEmergency,
    };
    const res = initial
      ? await updateContact(initial.id, payload)
      : await createContact(payload);
    setSaving(false);
    if (res.ok) onSaved();
    else setMsg(res.message ?? "Error");
  }

  async function remove() {
    if (!initial) return;
    setSaving(true);
    await deleteContact(initial.id);
    setSaving(false);
    onSaved();
  }

  return (
    <Sheet open onClose={onClose} title={initial ? "Editar contacto" : "Nuevo contacto"}>
      <div className="space-y-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre"
          className={field}
        />
        <input
          value={role}
          onChange={(e) => setRole(e.target.value)}
          placeholder="Rol (ej. Médico, Familiar)"
          className={field}
        />
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Teléfono"
          inputMode="tel"
          className={field}
        />
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Nota (opcional)"
          className={field}
        />
        <label className="flex items-center gap-2 text-base text-ink/80">
          <input
            type="checkbox"
            checked={isEmergency}
            onChange={(e) => setIsEmergency(e.target.checked)}
            className="h-5 w-5"
          />
          Contacto de emergencia
        </label>
        {msg ? <p className="text-sm text-status-late">{msg}</p> : null}
        <div className="flex gap-2 pt-1">
          <Button className="flex-1" onClick={save} disabled={saving}>
            {saving ? "Guardando…" : "Guardar"}
          </Button>
          {initial ? (
            <Button variant="danger" onClick={remove} disabled={saving}>
              Borrar
            </Button>
          ) : null}
        </div>
      </div>
    </Sheet>
  );
}

function InfoForm({
  info,
  onClose,
  onSaved,
}: {
  info: EmergencyInfo;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [bloodType, setBloodType] = useState(info.bloodType ?? "");
  const [allergies, setAllergies] = useState(info.allergies ?? "");
  const [conditions, setConditions] = useState(info.conditions ?? "");
  const [insurance, setInsurance] = useState(info.insurance ?? "");
  const [emergencyNote, setEmergencyNote] = useState(info.emergencyNote ?? "");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  async function save() {
    setMsg("");
    setSaving(true);
    const res = await updateEmergencyInfo({
      bloodType: bloodType || null,
      allergies: allergies || null,
      conditions: conditions || null,
      insurance: insurance || null,
      emergencyNote: emergencyNote || null,
    });
    setSaving(false);
    if (res.ok) onSaved();
    else setMsg(res.message ?? "Error");
  }

  return (
    <Sheet open onClose={onClose} title="Información clave">
      <div className="space-y-2">
        <input
          value={bloodType}
          onChange={(e) => setBloodType(e.target.value)}
          placeholder="Tipo de sangre (ej. O+)"
          className={field}
        />
        <textarea
          value={allergies}
          onChange={(e) => setAllergies(e.target.value)}
          placeholder="Alergias"
          rows={2}
          className="w-full rounded-xl border border-line p-3 text-base"
        />
        <textarea
          value={conditions}
          onChange={(e) => setConditions(e.target.value)}
          placeholder="Condiciones / diagnósticos"
          rows={2}
          className="w-full rounded-xl border border-line p-3 text-base"
        />
        <input
          value={insurance}
          onChange={(e) => setInsurance(e.target.value)}
          placeholder="Seguro / plan médico"
          className={field}
        />
        <textarea
          value={emergencyNote}
          onChange={(e) => setEmergencyNote(e.target.value)}
          placeholder="Indicaciones de emergencia"
          rows={2}
          className="w-full rounded-xl border border-line p-3 text-base"
        />
        {msg ? <p className="text-sm text-status-late">{msg}</p> : null}
        <Button className="w-full" onClick={save} disabled={saving}>
          {saving ? "Guardando…" : "Guardar"}
        </Button>
      </div>
    </Sheet>
  );
}
