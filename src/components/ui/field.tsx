import clsx from "clsx";
import type { ComponentProps, ReactNode } from "react";

const control =
  "w-full rounded-field bg-surface px-3 text-[0.9375rem] text-ink ring-1 ring-inset ring-line-strong placeholder:text-muted/70 transition-shadow focus:outline-none focus:ring-2 focus:ring-pine disabled:bg-sunken disabled:text-muted aria-[invalid=true]:ring-bad";

export function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
  className,
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  htmlFor: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-sm font-semibold text-ink">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="text-sm text-bad">
          {error}
        </p>
      ) : hint ? (
        <p id={`${htmlFor}-hint`} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={clsx(control, "h-10", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      className={clsx(control, "min-h-28 py-2.5 leading-relaxed", className)}
      {...props}
    />
  );
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return (
    <select
      className={clsx(control, "h-10 appearance-none pr-9", className)}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' fill='none'%3E%3Cpath stroke='%2363736e' stroke-width='1.6' d='m1 1.5 5 5 5-5'/%3E%3C/svg%3E\")",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 0.8rem center",
      }}
      {...props}
    />
  );
}
