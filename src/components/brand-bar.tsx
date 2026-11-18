import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Wordmark } from "./logo";

/**
 * Horná lišta v značkovej farbe s logom. Spoločná pre aplikáciu aj prihlásenie,
 * vpravo sú voliteľne údaje o používateľovi a odhlásenie.
 */
export function BrandBar({
  href,
  children,
  className,
}: {
  /** Kam vedie logo. Bez neho logo nie je odkaz. */
  href?: string;
  children?: ReactNode;
  /** Šírka obsahu, napr. max-w-5xl. */
  className?: string;
}) {
  return (
    <div className="bg-pine text-white [&_:focus-visible]:outline-white">
      <div className={cn("mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6", className)}>
        {href ? (
          <Link href={href} className="rounded-field" aria-label="Ubytovanie – úvodná stránka">
            <Wordmark inverted />
          </Link>
        ) : (
          <Wordmark inverted />
        )}
        {children ? <div className="ml-auto flex items-center gap-3 sm:gap-4">{children}</div> : null}
      </div>
    </div>
  );
}
