import { stateClasses, stateLabel, type OccurrenceState } from "@/lib/status";

export function StatusBadge({
  state,
  label,
}: {
  state: OccurrenceState;
  label?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-sm font-semibold ${stateClasses(
        state,
      )}`}
    >
      {label ?? stateLabel(state)}
    </span>
  );
}
