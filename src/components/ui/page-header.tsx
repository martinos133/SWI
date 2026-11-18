import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  actions,
  meta,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  /** Drobný údaj nad nadpisom, napr. akademický rok alebo späť odkaz. */
  meta?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-col gap-4 border-b border-line pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-3xl min-w-0">
        {meta ? <div className="mb-1.5 text-sm text-muted">{meta}</div> : null}
        <h1 className="text-2xl leading-tight font-semibold sm:text-[1.75rem]">{title}</h1>
        {description ? <p className="mt-1.5 text-[0.9375rem] text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}

/** Panel s hlavičkou – základný blok obsahu. */
export function Section({
  title,
  description,
  actions,
  children,
  flush = false,
  className,
  id,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  /** Obsah bez vnútorného odsadenia – pre tabuľky a zoznamy po okraj. */
  flush?: boolean;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={cn("rounded-panel border border-line bg-surface", className)}>
      <div className="flex flex-col gap-3 border-b border-line px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-base leading-6 font-semibold">{title}</h2>
          {description ? <p className="text-sm text-muted">{description}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
      </div>
      <div className={flush ? undefined : "px-5 py-5"}>{children}</div>
    </section>
  );
}

/** Jednoduchý panel bez hlavičky. */
export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-panel border border-line bg-surface p-5", className)}>{children}</div>
  );
}

export function EmptyState({
  title,
  children,
  action,
}: {
  title: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-2 rounded-panel border border-dashed border-line-strong bg-surface px-5 py-6">
      <p className="text-[0.9375rem] font-semibold">{title}</p>
      {children ? <div className="text-sm text-muted">{children}</div> : null}
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}

/** Zoznam údajov v pároch popis – hodnota. */
export function DataList({
  items,
  className,
  columns = 2,
}: {
  items: { label: ReactNode; value: ReactNode }[];
  className?: string;
  columns?: 1 | 2 | 3;
}) {
  return (
    <dl
      className={cn(
        "grid gap-x-6 gap-y-4",
        columns === 2 && "sm:grid-cols-2",
        columns === 3 && "sm:grid-cols-3",
        className,
      )}
    >
      {items.map((item, i) => (
        <div key={i} className="min-w-0">
          <dt className="text-[0.8125rem] text-muted">{item.label}</dt>
          <dd className="mt-0.5 font-medium break-words text-ink">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
