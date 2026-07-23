"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import {
  CalendarIcon,
  HomeIcon,
  LogoutIcon,
  PillIcon,
  SettingsIcon,
  TasksIcon,
} from "@/components/ui/icons";
import { signOut } from "@/app/(app)/actions/settings";

const ITEMS = [
  { href: "/", label: "Hoy", Icon: HomeIcon },
  { href: "/medicamentos", label: "Medicinas", Icon: PillIcon },
  { href: "/tareas", label: "Tareas", Icon: TasksIcon },
  { href: "/citas", label: "Citas", Icon: CalendarIcon },
  { href: "/configuracion", label: "Ajustes", Icon: SettingsIcon },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function BottomNav() {
  const pathname = usePathname();
  const [confirm, setConfirm] = useState(false);

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 shadow-nav backdrop-blur">
        <ul className="mx-auto flex max-w-lg items-stretch justify-between px-1 pb-[env(safe-area-inset-bottom)]">
          {ITEMS.map(({ href, label, Icon }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href} className="flex-1">
                <Link
                  href={href}
                  className="flex min-h-touch flex-col items-center justify-center gap-1 py-2"
                  aria-current={active ? "page" : undefined}
                >
                  <span
                    className={`flex h-8 w-11 items-center justify-center rounded-full transition-colors ${
                      active ? "bg-brand-soft text-brand-dark" : "text-muted"
                    }`}
                  >
                    <Icon className="h-6 w-6" />
                  </span>
                  <span
                    className={`text-[11px] font-semibold ${
                      active ? "text-brand-dark" : "text-muted"
                    }`}
                  >
                    {label}
                  </span>
                </Link>
              </li>
            );
          })}
          <li className="flex-1">
            <button
              onClick={() => setConfirm(true)}
              className="flex min-h-touch w-full flex-col items-center justify-center gap-1 py-2"
            >
              <span className="flex h-8 w-11 items-center justify-center rounded-full text-muted">
                <LogoutIcon className="h-6 w-6" />
              </span>
              <span className="text-[11px] font-semibold text-muted">Salir</span>
            </button>
          </li>
        </ul>
      </nav>

      <Sheet open={confirm} onClose={() => setConfirm(false)} title="Cerrar sesión">
        <div className="space-y-3">
          <p className="text-base text-muted">
            ¿Seguro que quieres salir? Tendrás que volver a entrar con tu correo y
            contraseña.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => setConfirm(false)}>
              Cancelar
            </Button>
            <form action={signOut}>
              <Button type="submit" variant="danger" className="w-full">
                Cerrar sesión
              </Button>
            </form>
          </div>
        </div>
      </Sheet>
    </>
  );
}
