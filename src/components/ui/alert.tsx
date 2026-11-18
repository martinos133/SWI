import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

type AlertTone = "info" | "ok" | "wait" | "bad" | "neutral";

const tones: Record<AlertTone, { box: string; icon: string }> = {
  info: { box: "border-info-line bg-info-tint before:bg-info", icon: "text-info" },
  ok: { box: "border-ok-line bg-ok-tint before:bg-ok", icon: "text-ok" },
  wait: { box: "border-wait-line bg-wait-tint before:bg-wait", icon: "text-wait" },
  bad: { box: "border-bad-line bg-bad-tint before:bg-bad", icon: "text-bad" },
  neutral: { box: "border-line bg-surface before:bg-line-hover", icon: "text-ink-soft" },
};

const icons: Record<AlertTone, ReactNode> = {
  info: <path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13Zm.75 9.75a.75.75 0 0 1-1.5 0V7.5a.75.75 0 0 1 1.5 0v3.75ZM8 6.05a.9.9 0 1 1 0-1.8.9.9 0 0 1 0 1.8Z" />,
  neutral: <path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13Zm.75 9.75a.75.75 0 0 1-1.5 0V7.5a.75.75 0 0 1 1.5 0v3.75ZM8 6.05a.9.9 0 1 1 0-1.8.9.9 0 0 1 0 1.8Z" />,
  ok: <path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13Zm3.03 4.72-3.75 4.5a.75.75 0 0 1-1.1.05l-2-2a.75.75 0 1 1 1.06-1.06l1.42 1.42 3.22-3.87a.75.75 0 1 1 1.15.96Z" />,
  wait: <path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13Zm-.75 3.25a.75.75 0 0 1 1.5 0v3.5a.75.75 0 0 1-1.5 0v-3.5ZM8 11.75a.9.9 0 1 1 0-1.8.9.9 0 0 1 0 1.8Z" />,
  bad: <path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13Zm-.75 3.25a.75.75 0 0 1 1.5 0v3.5a.75.75 0 0 1-1.5 0v-3.5ZM8 11.75a.9.9 0 1 1 0-1.8.9.9 0 0 1 0 1.8Z" />,
};

/**
 * Upozornenie v rámci stránky. Pre chyby po odoslaní formulára použi tone="bad" a role="alert",
 * pre potvrdenie uloženia tone="ok" a role="status".
 */
export function Alert({
  tone = "info",
  title,
  children,
  action,
  role,
  className,
}: {
  tone?: AlertTone;
  title?: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  role?: "alert" | "status";
  className?: string;
}) {
  return (
    <div
      role={role}
      className={cn(
        "relative flex gap-3 overflow-hidden rounded-panel border py-3 pr-4 pl-5 text-[0.9375rem] text-ink before:absolute before:inset-y-0 before:left-0 before:w-1",
        tones[tone].box,
        className,
      )}
    >
      <svg viewBox="0 0 16 16" aria-hidden className={cn("mt-0.5 size-[1.125rem] shrink-0", tones[tone].icon)} fill="currentColor">
        {icons[tone]}
      </svg>
      <div className="min-w-0 flex-1">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className={cn("text-ink-soft", title ? "mt-0.5 text-sm" : undefined)}>{children}</div> : null}
      </div>
      {action ? <div className="shrink-0 self-center">{action}</div> : null}
    </div>
  );
}
