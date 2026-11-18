import { cn } from "@/lib/cn";
import type { ReactNode } from "react";
import type { Tone } from "@/lib/status";

/** Stavový štítok: obdĺžnik s jemným podkladom a orámovaním v tóne stavu. */
const tones: Record<Tone, string> = {
  neutral: "border-line-strong bg-sunken text-ink-soft",
  info: "border-info-line bg-info-tint text-info",
  wait: "border-wait-line bg-wait-tint text-wait",
  ok: "border-ok-line bg-ok-tint text-ok",
  bad: "border-bad-line bg-bad-tint text-bad",
};

export function Badge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-tag border px-2 text-[0.8125rem] leading-none font-semibold whitespace-nowrap",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
