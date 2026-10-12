import Link from "next/link";
import { cn } from "@/lib/cn";
import type { ComponentProps } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 font-semibold whitespace-nowrap transition-colors disabled:pointer-events-none disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary: "bg-pine text-white hover:bg-pine-hover",
  secondary:
    "bg-surface text-ink ring-1 ring-inset ring-line-strong hover:bg-sunken",
  ghost: "text-ink-soft hover:bg-sunken hover:text-ink",
  danger: "bg-bad text-white hover:bg-[#93213a]",
};

const sizes: Record<Size, string> = {
  sm: "h-8 rounded-[0.4rem] px-3 text-sm",
  md: "h-10 rounded-field px-4 text-[0.9375rem]",
  lg: "h-12 rounded-field px-5 text-base",
};

type StyleProps = { variant?: Variant; size?: Size };

export function buttonClass({
  variant = "primary",
  size = "md",
}: StyleProps = {}) {
  return cn(base, variants[variant], sizes[size]);
}

export function Button({
  variant,
  size,
  className,
  ...props
}: ComponentProps<"button"> & StyleProps) {
  return (
    <button
      className={cn(buttonClass({ variant, size }), className)}
      {...props}
    />
  );
}

export function ButtonLink({
  variant,
  size,
  className,
  ...props
}: ComponentProps<typeof Link> & StyleProps) {
  return (
    <Link
      className={cn(buttonClass({ variant, size }), className)}
      {...props}
    />
  );
}
