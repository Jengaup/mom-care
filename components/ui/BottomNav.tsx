"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/", label: "Hoy", icon: "🏠" },
  { href: "/medicamentos", label: "Medicinas", icon: "💊" },
  { href: "/tareas", label: "Tareas", icon: "✅" },
  { href: "/citas", label: "Citas", icon: "📅" },
  { href: "/configuracion", label: "Ajustes", icon: "⚙️" },
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
        {ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className="flex min-h-touch flex-col items-center justify-center gap-1 py-2"
                aria-current={active ? "page" : undefined}
              >
                <span
                  className={`flex h-8 w-12 items-center justify-center rounded-full text-lg transition-colors ${
                    active ? "bg-brand-soft" : ""
                  }`}
                  aria-hidden
                >
                  {item.icon}
                </span>
                <span
                  className={`text-xs font-semibold ${
                    active ? "text-brand-dark" : "text-muted"
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
