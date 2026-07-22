import {
  stateClasses,
  stateColor,
  stateLabel,
  type OccurrenceState,
} from "@/lib/status";

const DOT: Record<ReturnType<typeof stateColor>, string> = {
  done: "bg-status-done",
  pending: "bg-status-pending",
  late: "bg-status-late",
  inactive: "bg-status-inactive",
};

export function StatusBadge({
  state,
  label,
}: {
  state: OccurrenceState;
  label?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-sm font-semibold ${stateClasses(
        state,
      )}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${DOT[stateColor(state)]}`}
        aria-hidden
      />
      {label ?? stateLabel(state)}
    </span>
  );
}
