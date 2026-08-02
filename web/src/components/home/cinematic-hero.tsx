"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { easeCinematic } from "@/lib/motion";
import { formatCurrency, formatNumber } from "@/lib/format";
import type { OverviewData } from "@/types/home";

export function CinematicHero({
  overview,
}: {
  overview: OverviewData;
}) {
  const root = useRef<HTMLElement>(null);
  const reducedMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: root,
    offset: ["start start", "end start"],
  });

  const imageY = useTransform(scrollYProgress, [0, 1], ["0%", "10%"]);
  const imageScale = useTransform(scrollYProgress, [0, 1], [1.02, 1.08]);
  const copyY = useTransform(scrollYProgress, [0, 1], ["0%", "17%"]);
  const copyOpacity = useTransform(scrollYProgress, [0, 0.78], [1, 0]);

  const totalValue = formatCurrency(
    overview.market_pulse.total_reported_purchase_value,
  );

  return (
    <section
      ref={root}
      className="relative min-h-[calc(100svh-5.5rem)] overflow-hidden border-b border-[var(--line)]"
    >
      <motion.div
        className="absolute inset-y-0 right-0 w-full md:w-[56%]"
        style={reducedMotion ? undefined : { y: imageY, scale: imageScale }}
        aria-hidden="true"
      >
        <div className="home-image relative h-full min-h-[calc(100svh-5.5rem)] w-full">
          <Image
            src="/editorial/boardroom.jpg"
            alt=""
            fill
            priority
            sizes="(max-width: 767px) 100vw, 56vw"
            className="object-cover"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--canvas)] via-[color-mix(in_srgb,var(--canvas)_52%,transparent)] to-transparent md:from-[var(--canvas)] md:via-transparent" />
      </motion.div>

      <motion.div
        className="editorial-container relative z-10 flex min-h-[calc(100svh-5.5rem)] flex-col justify-between py-8 md:py-12"
        style={
          reducedMotion
            ? undefined
            : { y: copyY, opacity: copyOpacity }
        }
      >
        <div className="flex items-center justify-between gap-6">
          <Badge tone="accent">Executive purchase intelligence</Badge>
          <p className="hidden max-w-[16rem] text-right font-mono text-[0.6875rem] uppercase leading-5 tracking-[0.12em] text-[var(--ink-muted)] md:block">
            SEC filings through{" "}
            {overview.as_of_date || "the latest export"}
          </p>
        </div>

        <div className="max-w-[70rem] py-20 md:py-28">
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: easeCinematic }}
            className="eyebrow mb-7"
          >
            An editorial investigation into conviction
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 30, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 1.1, ease: easeCinematic }}
            className="display-hero max-w-[11ch]"
          >
            What the executives know.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: 0.22,
              duration: 0.8,
              ease: easeCinematic,
            }}
            className="mt-8 max-w-xl text-lg leading-8 text-[var(--ink-muted)] md:ml-[18%] md:text-xl"
          >
            We read open-market purchases as human decisions, then compare
            each one with the executive&apos;s own history.
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45, duration: 0.8 }}
            className="mt-10 flex flex-wrap items-center gap-x-7 gap-y-4 md:ml-[18%]"
          >
            <Link
              href="/discoveries"
              className="group inline-flex items-center gap-3 border-b border-[var(--ink)] pb-1 text-sm"
            >
              Read today&apos;s evidence
              <ArrowUpRight
                className="size-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                aria-hidden="true"
              />
            </Link>
            <span className="font-mono text-xs uppercase tracking-[0.13em] text-[var(--ink-soft)]">
              {formatNumber(overview.counts.purchase_events)} purchase events
            </span>
          </motion.div>
        </div>

        <div className="grid items-end gap-8 border-t border-[var(--line)] pt-5 md:grid-cols-12">
          <div className="md:col-span-4">
            <p className="eyebrow">Reported buying observed</p>
            <p className="mt-2 font-mono text-xl tracking-[-0.04em]">
              {totalValue}
            </p>
          </div>
          <div className="md:col-span-4">
            <p className="eyebrow">Companies with active evidence</p>
            <p className="mt-2 font-mono text-xl tracking-[-0.04em]">
              {formatNumber(overview.market_pulse.active_company_count)}
            </p>
          </div>
          <a
            href="#today"
            className="group flex items-center gap-3 text-sm md:col-span-4 md:justify-end"
          >
            Continue the investigation
            <ArrowDown
              className="size-4 transition-transform duration-500 group-hover:translate-y-1"
              aria-hidden="true"
            />
          </a>
        </div>
      </motion.div>
    </section>
  );
}
