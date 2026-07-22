import { accentClasses, type StatusColor } from "@/lib/status";

export function Card({
  children,
  className = "",
  accent,
}: {
  children: React.ReactNode;
  className?: string;
  /** Lomo de color a la izquierda según estado (triaje de un vistazo). */
  accent?: StatusColor;
}) {
  return (
    <div
      className={`rounded-2xl border border-line bg-surface p-4 shadow-card ${
        accent ? accentClasses(accent) : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function CardTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 font-display text-xl font-semibold text-ink">
      {children}
    </h2>
  );
}
