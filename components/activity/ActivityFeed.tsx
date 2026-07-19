import { describeActivity } from "@/lib/activity";
import { formatTime } from "@/lib/time";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Enums } from "@/types/database";

export type ActivityItem = {
  id: string;
  action: Enums<"activity_action">;
  metadata: Record<string, unknown>;
  actorName: string | null;
  createdAt: string;
};

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) {
    return <EmptyState title="Sin actividad todavía" />;
  }
  return (
    <ul className="divide-y divide-gray-100 rounded-2xl border border-gray-200 bg-white">
      {items.map((it) => (
        <li key={it.id} className="flex items-start gap-3 p-3">
          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-status-done" />
          <div className="min-w-0 flex-1">
            <p className="text-base text-gray-800">
              {describeActivity(it.action, it.metadata, it.actorName)}
            </p>
            <p className="text-sm text-gray-400">{formatTime(it.createdAt)}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
