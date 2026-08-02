export function BehaviorSparkline({
  values,
  current,
}: {
  values: number[];
  current?: number | null;
}) {
  const all = [...values, current ?? 0];
  const max = Math.max(...all, 1);

  return (
    <div className="flex h-24 items-end gap-2" aria-label="Historical purchase sizes">
      {values.slice(-8).map((value, index) => (
        <div
          key={`${value}-${index}`}
          className="min-w-2 flex-1 bg-[var(--line-strong)]"
          style={{ height: `${Math.max(5, (value / max) * 100)}%` }}
        />
      ))}
      <div
        className="min-w-3 flex-[1.3] bg-[var(--accent)]"
        style={{ height: `${Math.max(8, ((current ?? 0) / max) * 100)}%` }}
      />
    </div>
  );
}
