import clsx from "clsx";
import type { ReactNode } from "react";

/**
 * Kľúčenka – mosadzná visačka kľúča od izby.
 * Kým študent miesto nemá, visačka je prázdna (nevyrazená); po pridelení
 * sa "vyrazí" mosadzou s názvom internátu a typom izby.
 */
export function KeyTag({
  blank = false,
  overline,
  title,
  figure,
  detail,
  className,
}: {
  blank?: boolean;
  overline?: ReactNode;
  title: ReactNode;
  figure?: ReactNode;
  detail?: ReactNode;
  className?: string;
}) {
  return (
    <figure
      className={clsx("animate-swing relative mx-auto w-full max-w-64", className)}
    >
      {/* krúžok, na ktorom visí */}
      <svg
        aria-hidden
        viewBox="0 0 60 60"
        className="absolute left-1/2 -top-7 z-10 size-[3.75rem] -translate-x-1/2"
      >
        <circle
          cx="30"
          cy="30"
          r="23"
          fill="none"
          stroke={blank ? "#b6c2bd" : "#7d8a86"}
          strokeWidth="3.5"
        />
        <circle
          cx="30"
          cy="30"
          r="23"
          fill="none"
          stroke="#ffffff"
          strokeOpacity="0.55"
          strokeWidth="1"
          strokeDasharray="22 122"
          strokeDashoffset="-8"
        />
      </svg>

      <div
        className={clsx(
          "relative rounded-t-[3.25rem] rounded-b-tag px-6 pt-14 pb-8 text-center",
          blank
            ? "border-2 border-dashed border-line-strong bg-surface"
            : "bg-[linear-gradient(165deg,#dcbd6c_0%,#c9a24b_48%,#b48d39_100%)] text-pine shadow-[0_18px_30px_-18px_rgba(15,46,42,0.55),inset_0_1px_0_rgba(255,255,255,0.45),inset_0_-2px_0_rgba(140,107,31,0.35)]",
        )}
      >
        {/* vyrazená diera */}
        <span
          aria-hidden
          className="absolute left-1/2 top-[1.15rem] size-4 -translate-x-1/2 rounded-full bg-paper shadow-[inset_0_1.5px_2px_rgba(15,46,42,0.45)]"
        />
        {/* gravírovaný okraj */}
        <span
          aria-hidden
          className={clsx(
            "pointer-events-none absolute inset-2.5 rounded-t-[2.75rem] rounded-b-[1.15rem] border",
            blank ? "border-dashed border-line" : "border-brass-deep/35",
          )}
        />

        {overline ? (
          <p
            className={clsx(
              "relative text-sm font-medium",
              blank ? "text-muted" : "text-pine/75",
            )}
          >
            {overline}
          </p>
        ) : null}
        <figcaption className="relative mt-1 text-xl leading-tight font-bold">
          {title}
        </figcaption>
        {figure ? (
          <p
            className={clsx(
              "relative mt-4 text-[3.5rem] leading-none font-extrabold tracking-[-0.04em] tabular-nums",
              blank ? "text-line-strong" : "text-pine [text-shadow:0_1px_0_rgba(255,255,255,0.35)]",
            )}
          >
            {figure}
          </p>
        ) : null}
        {detail ? (
          <p
            className={clsx(
              "relative mt-4 text-sm",
              blank ? "text-muted" : "text-pine/80",
            )}
          >
            {detail}
          </p>
        ) : null}
      </div>
    </figure>
  );
}
