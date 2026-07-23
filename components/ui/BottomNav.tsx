"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarIcon,
  HomeIcon,
  PillIcon,
  SettingsIcon,
  TasksIcon,
} from "@/components/ui/icons";

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

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 shadow-nav backdrop-blur">
      <ul className="mx-auto flex max-w-lg items-stretch justify-between px-2 pb-[env(safe-area-inset-bottom)]">
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
                  className={`flex h-8 w-12 items-center justify-center rounded-full transition-colors ${
                    active ? "bg-brand-soft text-brand-dark" : "text-muted"
                  }`}
                >
                  <Icon className="h-6 w-6" />
                </span>
                <span
                  className={`text-xs font-semibold ${
                    active ? "text-brand-dark" : "text-muted"
                  }`}
                >
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
