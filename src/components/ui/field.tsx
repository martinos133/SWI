import { cn } from "@/lib/cn";
import type { ComponentProps, ReactNode } from "react";

/*
 * Formulárové prvky. Vzhľad je v globals.css (.control, .check, .radio, .choice),
 * tu je iba štruktúra: popis, nápoveda, chyba a ich prepojenie cez aria-describedby.
 */

/** ID nápovedy a chyby pre pole – na prepojenie s aria-describedby. */
export function describedBy(id: string, { hint, error }: { hint?: unknown; error?: unknown }) {
  if (error) return `${id}-error`;
  if (hint) return `${id}-hint`;
  return undefined;
}

export function Field({
  label,
  hint,
  error,
  htmlFor,
  required,
  optional,
  children,
  className,
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  htmlFor: string;
  /** Zobrazí hviezdičku. Atribút required na samotnom prvku treba dať zvlášť. */
  required?: boolean;
  /** Zobrazí „nepovinné“ pri popise. */
  optional?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-sm leading-5 font-semibold text-ink">
        {label}
        {required ? (
          <span aria-hidden className="ml-0.5 text-bad">
            *
          </span>
        ) : null}
        {optional ? <span className="ml-1.5 font-normal text-muted">(nepovinné)</span> : null}
      </label>
      {children}
      {error ? (
        <FieldError id={`${htmlFor}-error`} role="alert">
          {error}
        </FieldError>
      ) : hint ? (
        <FieldHint id={`${htmlFor}-hint`}>{hint}</FieldHint>
      ) : null}
    </div>
  );
}

export function FieldHint({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <p id={id} className="text-[0.8125rem] leading-5 text-muted">
      {children}
    </p>
  );
}

export function FieldError({
  id,
  role,
  children,
}: {
  id?: string;
  role?: "alert";
  children: ReactNode;
}) {
  return (
    <p id={id} role={role} className="flex items-start gap-1.5 text-[0.8125rem] leading-5 font-medium text-bad">
      <svg viewBox="0 0 16 16" aria-hidden className="mt-0.5 size-4 shrink-0" fill="currentColor">
        <path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13Zm-.75 3.25a.75.75 0 0 1 1.5 0v3.5a.75.75 0 0 1-1.5 0v-3.5ZM8 11.75a.9.9 0 1 1 0-1.8.9.9 0 0 1 0 1.8Z" />
      </svg>
      <span>{children}</span>
    </p>
  );
}

/** Skupina volieb (prepínače, zaškrtávacie políčka) s nadpisom. */
export function Fieldset({
  legend,
  hint,
  error,
  id,
  children,
  className,
}: {
  legend: ReactNode;
  hint?: ReactNode;
  error?: string;
  id?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <fieldset
      className={cn("flex min-w-0 flex-col gap-2", className)}
      aria-describedby={id ? describedBy(id, { hint, error }) : undefined}
    >
      <legend className="mb-1 text-sm leading-5 font-semibold text-ink">{legend}</legend>
      {children}
      {error ? (
        <FieldError id={id ? `${id}-error` : undefined}>{error}</FieldError>
      ) : hint ? (
        <FieldHint id={id ? `${id}-hint` : undefined}>{hint}</FieldHint>
      ) : null}
    </fieldset>
  );
}

type ControlSize = { size?: "sm" | "md" };

export function Input({
  className,
  size = "md",
  ...props
}: Omit<ComponentProps<"input">, "size"> & ControlSize) {
  return <input className={cn("control", size === "sm" && "control-sm", className)} {...props} />;
}

export function Textarea({ className, rows = 4, ...props }: ComponentProps<"textarea">) {
  return <textarea rows={rows} className={cn("control", className)} {...props} />;
}

export function Select({
  className,
  size = "md",
  ...props
}: Omit<ComponentProps<"select">, "size"> & ControlSize) {
  return <select className={cn("control", size === "sm" && "control-sm", className)} {...props} />;
}

export function Checkbox({ className, ...props }: Omit<ComponentProps<"input">, "type">) {
  return <input type="checkbox" className={cn("check", className)} {...props} />;
}

export function Radio({ className, ...props }: Omit<ComponentProps<"input">, "type">) {
  return <input type="radio" className={cn("radio", className)} {...props} />;
}

/** Zaškrtávacie políčko alebo prepínač s textom vedľa. */
export function CheckField({
  type = "checkbox",
  label,
  description,
  className,
  ...props
}: Omit<ComponentProps<"input">, "type"> & {
  type?: "checkbox" | "radio";
  label: ReactNode;
  description?: ReactNode;
}) {
  return (
    <label className={cn("flex cursor-pointer gap-2.5 text-[0.9375rem]", className)}>
      <input type={type} className={type === "radio" ? "radio" : "check"} {...props} />
      <span className="min-w-0">
        <span className="block leading-6 text-ink">{label}</span>
        {description ? <span className="block text-sm text-muted">{description}</span> : null}
      </span>
    </label>
  );
}

/** Voľba ako karta – väčšia klikateľná plocha pre dôležité rozhodnutia. */
export function ChoiceCard({
  type = "radio",
  label,
  description,
  aside,
  className,
  ...props
}: Omit<ComponentProps<"input">, "type"> & {
  type?: "checkbox" | "radio";
  label: ReactNode;
  description?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <label className={cn("choice", className)}>
      <input type={type} className={type === "radio" ? "radio" : "check"} {...props} />
      <span className="min-w-0 flex-1">
        <span className="block leading-6 font-semibold text-ink">{label}</span>
        {description ? <span className="mt-0.5 block text-sm text-muted">{description}</span> : null}
      </span>
      {aside ? <span className="shrink-0 text-sm text-ink-soft">{aside}</span> : null}
    </label>
  );
}
