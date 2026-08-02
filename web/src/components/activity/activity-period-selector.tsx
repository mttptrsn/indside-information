import type { ActivityWindow } from "@/types/activity";

const options: Array<{
  id: ActivityWindow;
  label: string;
}> = [
  { id: "1d", label: "Today" },
  { id: "7d", label: "7 days" },
  { id: "30d", label: "30 days" },
  { id: "90d", label: "90 days" },
];

export function ActivityPeriodSelector({
  value,
  onChange,
}: {
  value: ActivityWindow;
  onChange: (value: ActivityWindow) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange(option.id)}
          className={`shrink-0 border px-4 py-2 text-sm ${
            value === option.id
              ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--canvas)]"
              : "border-[var(--line)]"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
