import { Ban, Clock3, Gavel, ShieldAlert } from "lucide-react";
import type { ActivityRecord } from "@/types/activity";

type ActivityListProps = {
  records: ActivityRecord[];
  selectedActivityId: string;
  onSelectActivity: (activityId: string) => void;
};

const punishmentStyles = {
  ban: {
    Icon: Ban,
    railColor: "color-mix(in srgb, var(--error) 88%, white 12%)",
    pillBackground: "color-mix(in srgb, var(--error) 14%, transparent)",
    pillText: "text-[var(--error)]",
    iconColor: "text-[var(--error)]",
  },
  kick: {
    Icon: ShieldAlert,
    railColor: "color-mix(in srgb, var(--tertiary) 82%, white 18%)",
    pillBackground: "color-mix(in srgb, var(--tertiary) 14%, transparent)",
    pillText: "text-[var(--tertiary)]",
    iconColor: "text-[var(--tertiary)]",
  },
  timeout: {
    Icon: Clock3,
    railColor: "color-mix(in srgb, var(--secondary) 82%, white 18%)",
    pillBackground: "color-mix(in srgb, var(--secondary) 14%, transparent)",
    pillText: "text-[var(--secondary)]",
    iconColor: "text-[var(--secondary)]",
  },
  default: {
    Icon: Gavel,
    railColor: "color-mix(in srgb, var(--primary) 58%, white 12%)",
    pillBackground: "color-mix(in srgb, var(--primary) 14%, transparent)",
    pillText: "text-[var(--primary)]",
    iconColor: "text-[var(--primary)]",
  },
} as const;

const statusTone = {
  Active: "bg-[color:color-mix(in_srgb,var(--error)_16%,transparent)] text-[var(--error)]",
  Expired:
    "bg-[color:color-mix(in_srgb,var(--surface-container-highest)_88%,transparent)] text-[var(--on-surface-variant)]",
} as const;

export default function ActivityList({
  records,
  selectedActivityId,
  onSelectActivity,
}: ActivityListProps) {
  const sortedRecords = [...records].sort(
    (left, right) => right.issuedAtTimestamp - left.issuedAtTimestamp,
  );

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        {sortedRecords.map((record) => {
          const key = record.punishmentType.toLowerCase();
          const style =
            punishmentStyles[key as keyof typeof punishmentStyles] ?? punishmentStyles.default;
          const Icon = style.Icon;
          const isSelected = selectedActivityId === record.id;

          return (
            <button
              key={record.id}
              type="button"
              onClick={() => onSelectActivity(record.id)}
              className={[
                "group flex cursor-pointer gap-6 rounded-3xl border-l-[5px] p-5 text-left transition-all",
                isSelected
                  ? "bg-[var(--surface-container-high)]"
                  : record.isActive
                    ? "bg-[var(--surface-container-low)] hover:bg-[var(--surface-bright)]"
                    : "bg-[var(--surface-container-lowest)] opacity-80 hover:opacity-100",
              ].join(" ")}
              style={{ borderLeftColor: style.railColor }}
            >
              <div className="flex shrink-0 flex-col items-center gap-2">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--surface-container-lowest)]">
                  <Icon className={["h-5 w-5", style.iconColor].join(" ")} />
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-3">
                  <span className="text-sm font-bold text-[var(--on-surface)]">
                    {record.title}
                  </span>
                  <span
                    className={[
                      "rounded px-2 py-0.5 text-[10px] font-black uppercase",
                      style.pillText,
                    ].join(" ")}
                    style={{ background: style.pillBackground }}
                  >
                    {record.punishmentType}
                  </span>
                  <span
                    className={[
                      "rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.18em]",
                      statusTone[record.status],
                    ].join(" ")}
                  >
                    {record.status}
                  </span>
                </div>

                <p className="mb-3 line-clamp-2 text-sm text-[var(--on-surface-variant)]">
                  {record.reason}
                </p>

                <div className="flex flex-wrap items-center gap-5 text-xs text-[var(--on-surface-variant)]">
                  <span>{record.issuedAt}</span>
                  <span>{record.durationLabel}</span>
                  <span>{record.caseReference}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
