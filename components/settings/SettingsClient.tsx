"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import {
  updateMyProfile,
  updateGraceMinutes,
  updateCaregiverRole,
  signOut,
} from "@/app/(app)/actions/settings";

type Caregiver = { id: string; full_name: string | null; role: "admin" | "caregiver" };

const field = "min-h-touch w-full rounded-xl border border-line px-4 text-base";

export function SettingsClient({
  me,
  isAdmin,
  graceMinutes,
  caregivers,
}: {
  me: { id: string; fullName: string; phone: string };
  isAdmin: boolean;
  graceMinutes: number;
  caregivers: Caregiver[];
}) {
  const router = useRouter();
  const [fullName, setFullName] = useState(me.fullName);
  const [phone, setPhone] = useState(me.phone);
  const [profileMsg, setProfileMsg] = useState("");

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
    setGraceMsg(res.ok ? "Guardado" : res.message ?? "Error");
    if (res.ok) router.refresh();
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

      {/* Ventana de gracia (admin) */}
      {isAdmin ? (
        <Card className="space-y-3">
          <CardTitle>Ventana de gracia</CardTitle>
          <p className="text-sm text-muted">
            Minutos tras la hora antes de marcar una dosis como atrasada.
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
