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
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur">
      <ul className="mx-auto flex max-w-lg items-stretch justify-between">
        {ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={`flex min-h-touch flex-col items-center justify-center gap-0.5 py-2 text-xs font-medium ${
                  active ? "text-status-done" : "text-gray-500"
                }`}
                aria-current={active ? "page" : undefined}
              >
                <span className="text-xl" aria-hidden>
                  {item.icon}
                </span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
