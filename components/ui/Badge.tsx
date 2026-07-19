import { stateClasses, stateLabel, type OccurrenceState } from "@/lib/status";

export function StatusBadge({ state }: { state: OccurrenceState }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-sm font-semibold ${stateClasses(
        state,
      )}`}
    >
      {stateLabel(state)}
    </span>
  );
}
