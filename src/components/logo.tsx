import clsx from "clsx";

/** Znak aplikácie – silueta kľúčenky s vyrazenou dierou. */
export function LogoMark({ className, inverted = false }: { className?: string; inverted?: boolean }) {
  return (
    <svg viewBox="0 0 24 30" aria-hidden className={clsx("h-7 w-auto", className)}>
      <path
        d="M12 1.5c5.8 0 10.5 4.2 10.5 9.6V24a4.5 4.5 0 0 1-4.5 4.5H6A4.5 4.5 0 0 1 1.5 24V11.1C1.5 5.7 6.2 1.5 12 1.5Z"
        fill="#c9a24b"
      />
      <circle cx="12" cy="8" r="2.4" fill={inverted ? "#0f2e2a" : "#f1f3f1"} />
      <path
        d="M7.5 15.5h9M7.5 19.5h6"
        stroke="#0f2e2a"
        strokeOpacity="0.55"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Wordmark({ inverted = false }: { inverted?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark inverted={inverted} />
      <span
        className={clsx(
          "text-[1.0625rem] font-extrabold tracking-[-0.02em]",
          inverted ? "text-white" : "text-ink",
        )}
      >
        Ubytovanie
      </span>
    </span>
  );
}
