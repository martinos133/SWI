"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItem } from "@/lib/roles";

export function NavLinks({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Hlavná navigácia" className="-mb-px flex gap-1 overflow-x-auto">
      {items.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={clsx(
              "relative shrink-0 px-3 py-4 text-sm font-medium whitespace-nowrap transition-colors",
              active ? "text-ink" : "text-muted hover:text-ink",
            )}
          >
            {item.label}
            <span
              aria-hidden
              className={clsx(
                "absolute inset-x-3 bottom-0 h-0.5 transition-colors",
                active ? "bg-pine" : "bg-transparent",
              )}
            />
          </Link>
        );
      })}
    </nav>
  );
}
