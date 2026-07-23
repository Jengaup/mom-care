/**
 * Set de íconos de línea propio (stroke, currentColor). Reemplaza los emojis
 * para consistencia entre dispositivos y una identidad más distintiva.
 */
type IconProps = { className?: string };

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function HomeIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5 10v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9" />
      <path d="M9.5 20v-5h5v5" />
    </svg>
  );
}

export function PillIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <rect x="3" y="8" width="18" height="8" rx="4" transform="rotate(-45 12 12)" />
      <path d="M8.5 8.5 15.5 15.5" />
    </svg>
  );
}

export function TasksIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <path d="M4 5h11" />
      <path d="M4 12h11" />
      <path d="M4 19h7" />
      <path d="M17.5 17.5 19 19l3-3.5" />
    </svg>
  );
}

export function CalendarIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <rect x="3.5" y="5" width="17" height="16" rx="2.5" />
      <path d="M3.5 9.5h17M8 3.5v3M16 3.5v3" />
    </svg>
  );
}

export function SettingsIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <path d="M4 7h8M16 7h4M4 12h4M12 12h8M4 17h10M18 17h2" />
      <circle cx="14" cy="7" r="2" />
      <circle cx="10" cy="12" r="2" />
      <circle cx="16" cy="17" r="2" />
    </svg>
  );
}

export function LogoutIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <path d="M15 4h3a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-3" />
      <path d="M10 8l-4 4 4 4" />
      <path d="M6 12h9" />
    </svg>
  );
}

export function HeartIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <path d="M12 20s-7-4.4-9.2-8.6C1.3 8.6 2.6 5.5 5.6 5.1 7.5 4.9 9 6 12 8.7c3-2.7 4.5-3.8 6.4-3.6 3 .4 4.3 3.5 2.8 6.3C19 15.6 12 20 12 20Z" />
    </svg>
  );
}
