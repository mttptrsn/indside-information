import { ActivityCalendar } from "@/components/visuals/activity-calendar";
import type {
  DailyActivityData,
  HeartbeatData,
} from "@/types/home";

export function ActivityStory({
  activity,
  heartbeat,
}: {
  activity: DailyActivityData;
  heartbeat: HeartbeatData;
}) {
  return (
    <article>
      <header className="editorial-container py-12 md:py-16">
        <p className="eyebrow">Activity</p>
        <h1 className="mt-5 max-w-[10ch] font-display text-6xl leading-[0.9] tracking-[-0.06em] md:text-8xl">
          See who bought, and when.
        </h1>
      </header>

      <section className="section-space border-y border-[var(--line)] bg-[var(--surface)]">
        <div className="editorial-container">
          <ActivityCalendar
            activity={activity}
            heartbeat={heartbeat}
            visibleDays={24}
          />
        </div>
      </section>
    </article>
  );
}
