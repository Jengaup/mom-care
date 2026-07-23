"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import {
  updateMyProfile,
  updateGraceMinutes,
  updateCaregiverRole,
  removeCaregiver,
  setTextSize,
  signOut,
} from "@/app/(app)/actions/settings";

type Caregiver = { id: string; full_name: string | null; role: "admin" | "caregiver" };

const field = "min-h-touch w-full rounded-xl border border-line px-4 text-base";

export function SettingsClient({
  me,
  isAdmin,
  graceMinutes,
  caregivers,
  textLarge,
}: {
  me: { id: string; fullName: string; phone: string };
  isAdmin: boolean;
  graceMinutes: number;
  caregivers: Caregiver[];
  textLarge: boolean;
}) {
  const router = useRouter();
  const [fullName, setFullName] = useState(me.fullName);
  const [phone, setPhone] = useState(me.phone);
  const [profileMsg, setProfileMsg] = useState("");
  const [large, setLarge] = useState(textLarge);

  async function toggleTextSize(next: boolean) {
    setLarge(next);
    await setTextSize(next ? "lg" : "normal");
    router.refresh();
  }

  const [grace, setGrace] = useState(String(graceMinutes));
  const [graceMsg, setGraceMsg] = useState("");

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteMsg, setInviteMsg] = useState("");
  const [inviting, setInviting] = useState(false);

  async function saveProfile() {
    setProfileMsg("");
    const res = await updateMyProfile({ fullName, phone: phone || null });
    setProfileMsg(res.ok ? "Guardado" : res.message ?? "Error");
    if (res.ok) router.refresh();
  }

  async function saveGrace() {
    setGraceMsg("");
    const res = await updateGraceMinutes(Number(grace) || 0);
    if (res.ok) {
      const v = res.value ?? (Number(grace) || 0);
      setGrace(String(v));
      setGraceMsg(`Guardado · ahora ${v} min`);
      router.refresh();
    } else {
      setGraceMsg(res.message ?? "Error");
    }
  }

  async function invite() {
    setInviteMsg("");
    setInviting(true);
    try {
      const res = await fetch("/api/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setInviteMsg("Invitación enviada.");
        setInviteEmail("");
        router.refresh();
      } else {
        setInviteMsg(data.error ?? "No se pudo invitar.");
      }
    } catch {
      setInviteMsg("No se pudo invitar.");
    } finally {
      setInviting(false);
    }
  }

  async function changeRole(profileId: string, role: "admin" | "caregiver") {
    await updateCaregiverRole({ profileId, role });
    router.refresh();
  }

  async function removeCg(profileId: string) {
    if (!window.confirm("¿Quitar a este cuidador del paciente?")) return;
    const res = await removeCaregiver(profileId);
    if (!res.ok && res.message) window.alert(res.message);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {/* Perfil propio */}
      <Card className="space-y-3">
        <CardTitle>Mi perfil</CardTitle>
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Nombre completo"
          className={field}
        />
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Teléfono"
          inputMode="tel"
          className={field}
        />
        <div className="flex items-center gap-3">
          <Button onClick={saveProfile}>Guardar</Button>
          {profileMsg ? (
            <span className="text-sm text-muted">{profileMsg}</span>
          ) : null}
        </div>
      </Card>

      {/* Tamaño de texto (todos) */}
      <Card className="space-y-3">
        <CardTitle>Tamaño de texto</CardTitle>
        <p className="text-sm text-muted">
          Agranda toda la letra de la app para leerla más fácil.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => toggleTextSize(false)}
            className={`min-h-touch rounded-xl border text-base font-semibold ${
              !large
                ? "border-brand bg-brand-soft text-brand-dark"
                : "border-line text-muted"
            }`}
          >
            Normal
          </button>
          <button
            type="button"
            onClick={() => toggleTextSize(true)}
            className={`min-h-touch rounded-xl border text-lg font-semibold ${
              large
                ? "border-brand bg-brand-soft text-brand-dark"
                : "border-line text-muted"
            }`}
          >
            Grande
          </button>
        </div>
      </Card>

      {/* Ventana de gracia (admin) */}
      {isAdmin ? (
        <Card className="space-y-3">
          <CardTitle>Ventana de gracia</CardTitle>
          <p className="text-sm text-muted">
            Tras su hora, una dosis se muestra en <b>amarillo</b> (&quot;toca
            ahora&quot;) durante esta ventana; al pasarla se marca en{" "}
            <b>rojo</b> (&quot;atrasada&quot;). Ej: con 60 min, una dosis de las
            8:00 se pone roja a las 9:00.
          </p>
          <div className="flex items-center gap-2">
            <input
              value={grace}
              onChange={(e) => setGrace(e.target.value)}
              inputMode="numeric"
              className={`${field} max-w-28`}
            />
            <span className="text-muted">min</span>
            <Button onClick={saveGrace}>Guardar</Button>
          </div>
          {graceMsg ? (
            <span className="text-sm text-muted">{graceMsg}</span>
          ) : null}
        </Card>
      ) : null}

      {/* Cuidadores */}
      <Card className="space-y-3">
        <CardTitle>Cuidadores</CardTitle>
        <ul className="divide-y divide-line">
          {caregivers.map((c) => (
            <li key={c.id} className="flex items-center justify-between py-2">
              <span className="text-base text-ink">
                {c.full_name ?? "—"}
                {c.id === me.id ? " (tú)" : ""}
              </span>
              {isAdmin && c.id !== me.id ? (
                <div className="flex items-center gap-2">
                  <select
                    defaultValue={c.role}
                    onChange={(e) =>
                      changeRole(c.id, e.target.value as "admin" | "caregiver")
                    }
                    className="min-h-touch rounded-xl border border-line px-2 text-sm"
                  >
                    <option value="caregiver">Cuidador</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button
                    onClick={() => removeCg(c.id)}
                    className="min-h-touch px-2 text-sm font-semibold text-status-late"
                    aria-label={`Quitar a ${c.full_name ?? "cuidador"}`}
                  >
                    Quitar
                  </button>
                </div>
              ) : (
                <span className="text-sm text-muted">
                  {c.role === "admin" ? "Admin" : "Cuidador"}
                </span>
              )}
            </li>
          ))}
        </ul>

        {isAdmin ? (
          <div className="space-y-2 border-t border-line pt-3">
            <p className="text-sm font-medium text-ink/80">
              Invitar cuidador
            </p>
            <div className="flex gap-2">
              <input
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="correo@ejemplo.com"
                type="email"
                className={field}
              />
              <Button onClick={invite} disabled={inviting || !inviteEmail}>
                Invitar
              </Button>
            </div>
            {inviteMsg ? (
              <span className="text-sm text-muted">{inviteMsg}</span>
            ) : null}
          </div>
        ) : null}
      </Card>

      {/* Cerrar sesión */}
      <form action={signOut}>
        <Button type="submit" variant="secondary" className="w-full">
          Cerrar sesión
        </Button>
      </form>
    </div>
  );
}
