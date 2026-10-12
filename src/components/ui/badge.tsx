import clsx from "clsx";
import type { ReactNode } from "react";
import type { Tone } from "@/lib/status";

const tones: Record<Tone, string> = {
  neutral: "bg-sunken text-ink-soft",
  info: "bg-info-tint text-info",
  wait: "bg-wait-tint text-wait",
  ok: "bg-ok-tint text-ok",
  bad: "bg-bad-tint text-bad",
  brass: "bg-brass-tint text-brass-deep",
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
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[0.8125rem] font-semibold whitespace-nowrap",
        tones[tone],
        className,
      )}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}
