import Link from "next/link";
import { cn } from "@/lib/cn";
import type { ComponentProps } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "link";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-field font-semibold whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary: "border border-pine bg-pine text-white hover:border-pine-hover hover:bg-pine-hover active:bg-pine-active",
  secondary:
    "border border-line-strong bg-surface text-ink hover:border-line-hover hover:bg-hover active:bg-sunken",
  ghost: "border border-transparent text-ink-soft hover:bg-sunken hover:text-ink",
  danger: "border border-bad bg-bad text-white hover:border-[#951f18] hover:bg-[#951f18]",
  link: "h-auto! px-0! font-semibold text-pine underline decoration-pine/30 underline-offset-4 hover:decoration-pine",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-[0.9375rem]",
  lg: "h-11 px-5 text-base",
};

type StyleProps = { variant?: Variant; size?: Size };

export function buttonClass({ variant = "primary", size = "md" }: StyleProps = {}) {
  return cn(base, sizes[size], variants[variant]);
}

export function Button({
  variant,
  size,
  className,
  ...props
}: ComponentProps<"button"> & StyleProps) {
  return <button className={cn(buttonClass({ variant, size }), className)} {...props} />;
}

export function ButtonLink({
  variant,
  size,
  className,
  ...props
}: ComponentProps<typeof Link> & StyleProps) {
  return <Link className={cn(buttonClass({ variant, size }), className)} {...props} />;
}
