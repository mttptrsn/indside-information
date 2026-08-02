import type { ReactNode } from "react";

export function StorySection({
  question,
  answer,
  children,
  dark = false,
}: {
  question: string;
  answer: string;
  children?: ReactNode;
  dark?: boolean;
}) {
  return (
    <section className={dark ? "ink-panel section-space" : "section-space"}>
      <div className="editorial-container">
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <p className={dark ? "eyebrow text-[color-mix(in_srgb,var(--canvas)_58%,transparent)]" : "eyebrow"}>
              {question}
            </p>
          </div>
          <div className="lg:col-span-8">
            <h2 className="max-w-[16ch] font-display text-5xl leading-[0.96] tracking-[-0.045em] md:text-7xl">
              {answer}
            </h2>
            {children ? <div className="mt-12">{children}</div> : null}
          </div>
        </div>
      </div>
    </section>
  );
}
