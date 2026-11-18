import { cn } from "@/lib/cn";
import type { ComponentProps } from "react";

/*
 * Tabuľka údajov. Obal sa posúva vodorovne, hlavička je na sivom podklade,
 * riadky oddelené linkou, čísla zarovnané doprava (align="right").
 */

export function Table({
  className,
  minWidth = "44rem",
  bordered = true,
  ...props
}: ComponentProps<"table"> & { minWidth?: string; bordered?: boolean }) {
  return (
    <div
      className={cn(
        "overflow-x-auto bg-surface",
        bordered && "rounded-panel border border-line",
      )}
    >
      <table
        className={cn("w-full border-collapse text-left text-[0.9375rem]", className)}
        style={{ minWidth }}
        {...props}
      />
    </div>
  );
}

export function THead({ className, ...props }: ComponentProps<"thead">) {
  return <thead className={cn("border-b border-line bg-sunken/60", className)} {...props} />;
}

export function TBody({ className, ...props }: ComponentProps<"tbody">) {
  return <tbody className={cn("divide-y divide-line", className)} {...props} />;
}

export function TR({
  className,
  interactive = false,
  ...props
}: ComponentProps<"tr"> & { interactive?: boolean }) {
  return (
    <tr
      className={cn(interactive && "group relative transition-colors hover:bg-hover", className)}
      {...props}
    />
  );
}

type Align = { align?: "left" | "right" | "center" };

export function TH({ className, align = "left", ...props }: Omit<ComponentProps<"th">, "align"> & Align) {
  return (
    <th
      scope="col"
      className={cn(
        "px-4 py-2.5 text-[0.8125rem] font-semibold whitespace-nowrap text-ink-soft",
        align === "right" && "text-right",
        align === "center" && "text-center",
        className,
      )}
      {...props}
    />
  );
}

export function TD({ className, align = "left", ...props }: Omit<ComponentProps<"td">, "align"> & Align) {
  return (
    <td
      className={cn(
        "px-4 py-3 align-middle",
        align === "right" && "text-right tabular-nums",
        align === "center" && "text-center",
        className,
      )}
      {...props}
    />
  );
}

/** Odkaz v prvej bunke, ktorý roztiahne klikateľnú plochu na celý riadok (TR interactive). */
export const rowLinkClass = "font-semibold text-ink after:absolute after:inset-0 group-hover:text-pine group-hover:underline";
