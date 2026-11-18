import Link, { type LinkProps } from "next/link";
import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

/**
 * Záložky ako odkazy (filter v URL). Aktívna záložka má aria-current="page"
 * a podčiarknutie značkovou farbou.
 */
export function Tabs({
  label,
  items,
  className,
}: {
  label: string;
  items: { key: string; href: LinkProps["href"]; label: ReactNode; count?: number; active: boolean }[];
  className?: string;
}) {
  return (
    <nav aria-label={label} className={cn("border-b border-line", className)}>
      <ul className="-mb-px flex gap-1 overflow-x-auto">
        {items.map((item) => (
          <li key={item.key} className="shrink-0">
            <Link
              href={item.href}
              aria-current={item.active ? "page" : undefined}
              className={cn(
                "inline-flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors",
                item.active
                  ? "border-pine text-ink"
                  : "border-transparent text-muted hover:border-line-strong hover:text-ink",
              )}
            >
              {item.label}
              {item.count !== undefined ? (
                <span
                  className={cn(
                    "min-w-6 rounded-tag px-1.5 py-px text-center text-xs font-semibold tabular-nums",
                    item.active ? "bg-pine text-white" : "bg-sunken text-ink-soft",
                  )}
                >
                  {item.count}
                </span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
