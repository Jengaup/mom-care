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
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 px-4 py-2 backdrop-blur">
      <p className="truncate text-base font-semibold text-gray-900">{name}</p>
      {sub ? <p className="text-sm text-gray-500">{sub}</p> : null}
    </header>
  );
}
