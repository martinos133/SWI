import clsx from "clsx";

/** Znak aplikácie – silueta kľúčenky s vyrazenou dierou. */
export function LogoMark({ className, inverted = false }: { className?: string; inverted?: boolean }) {
  return (
    <svg viewBox="0 0 24 30" aria-hidden className={clsx("h-7 w-auto", className)}>
      <path
        d="M12 1.5c5.8 0 10.5 4.2 10.5 9.6V24a4.5 4.5 0 0 1-4.5 4.5H6A4.5 4.5 0 0 1 1.5 24V11.1C1.5 5.7 6.2 1.5 12 1.5Z"
        fill="#b8923a"
      />
      <circle cx="12" cy="8" r="2.4" fill={inverted ? "#14473f" : "#f5f6f6"} />
      <path
        d="M7.5 15.5h9M7.5 19.5h6"
        stroke="#14473f"
        strokeOpacity="0.55"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Logo s názvom aplikácie a útvaru, ktorý ju prevádzkuje. */
export function Wordmark({ inverted = false }: { inverted?: boolean }) {
  return (
    <span className="flex items-center gap-3">
      <LogoMark inverted={inverted} />
      <span className="flex flex-col leading-tight">
        <span
          className={clsx(
            "text-[0.9375rem] font-semibold tracking-[-0.01em]",
            inverted ? "text-white" : "text-ink",
          )}
        >
          Ubytovanie
        </span>
        <span className={clsx("hidden text-xs sm:block", inverted ? "text-white/75" : "text-muted")}>
          Ubytovacie oddelenie univerzity
        </span>
      </span>
    </span>
  );
}
