import { differenceInYears } from "date-fns";
import { formatApp } from "@/lib/time";

/** Cabecera fija con el paciente activo. Aparece en todas las pantallas (app). */
export function PatientHeader({
  name,
  birthDate,
}: {
  name: string;
  birthDate: string | null;
}) {
  let sub: string | null = null;
  if (birthDate) {
    const born = new Date(`${birthDate}T12:00:00`);
    const age = differenceInYears(new Date(), born);
    sub = `${formatApp(`${birthDate}T12:00:00`, "d 'de' MMM yyyy")} · ${age} años`;
  }

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/85 px-4 py-2.5 backdrop-blur">
      <div className="flex items-center gap-3">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft font-display text-lg font-semibold text-brand-dark"
          aria-hidden
        >
          {name.trim().charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="truncate font-display text-lg font-semibold leading-tight text-ink">
            {name}
          </p>
          {sub ? <p className="text-sm text-muted">{sub}</p> : null}
        </div>
      </div>
    </header>
  );
}
