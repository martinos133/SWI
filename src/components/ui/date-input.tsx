"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { cn } from "@/lib/cn";

/**
 * Dátumové pole s vlastným kalendárom v štýle systému. Natívny kalendár prehliadača
 * sa nedá naštýlovať, preto ho nahrádzame. Do formulára ide skrytá hodnota
 * vo formáte YYYY-MM-DD, takže serverové akcie sa nemenia.
 * Dátum sa dá napísať (15. 1. 2027) alebo vybrať z kalendára.
 */

const WEEKDAYS = [
  ["Po", "pondelok"],
  ["Ut", "utorok"],
  ["St", "streda"],
  ["Št", "štvrtok"],
  ["Pi", "piatok"],
  ["So", "sobota"],
  ["Ne", "nedeľa"],
] as const;

const monthLabel = new Intl.DateTimeFormat("sk-SK", { month: "long", year: "numeric" });
const dayLabel = new Intl.DateTimeFormat("sk-SK", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const pad = (n: number) => String(n).padStart(2, "0");
const toIso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromIso = (iso: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
};
const display = (iso: string) => {
  const d = fromIso(iso);
  return d ? `${d.getDate()}. ${d.getMonth() + 1}. ${d.getFullYear()}` : "";
};
const sameDay = (a: Date, b: Date) => toIso(a) === toIso(b);
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const addMonths = (d: Date, n: number) => {
  const target = new Date(d.getFullYear(), d.getMonth() + n, 1);
  const last = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  return new Date(target.getFullYear(), target.getMonth(), Math.min(d.getDate(), last));
};
/** Pondelok ako prvý deň týždňa. */
const weekdayIndex = (d: Date) => (d.getDay() + 6) % 7;

/** "15. 1. 2027", "15.1.2027" alebo "2027-01-15" → ISO; inak null. */
function parse(text: string): string | null {
  const t = text.trim();
  if (fromIso(t)) return t;
  const m = /^(\d{1,2})\s*\.\s*(\d{1,2})\s*\.\s*(\d{4})$/.exec(t);
  if (!m) return null;
  const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  return d.getDate() === Number(m[1]) && d.getMonth() === Number(m[2]) - 1 ? toIso(d) : null;
}

/** Šesť týždňov od pondelka pred prvým dňom mesiaca. */
function monthGrid(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = addDays(first, -weekdayIndex(first));
  return Array.from({ length: 6 }, (_, w) => Array.from({ length: 7 }, (_, d) => addDays(start, w * 7 + d)));
}

type DateInputProps = {
  id: string;
  name: string;
  defaultValue?: string;
  required?: boolean;
  disabled?: boolean;
  size?: "sm" | "md";
  className?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
};

export function DateInput({
  id,
  name,
  defaultValue = "",
  required,
  disabled,
  size = "md",
  className,
  ...aria
}: DateInputProps) {
  const [value, setValue] = useState(defaultValue);
  const [text, setText] = useState(display(defaultValue));
  const [invalid, setInvalid] = useState(false);
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState<Date>(() => fromIso(defaultValue) ?? new Date());

  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const gridRef = useRef<HTMLTableElement>(null);
  const focusGrid = useRef(false);
  const dialogId = useId();
  const titleId = useId();

  const today = new Date();
  const selected = fromIso(value);

  // Zatvorenie kliknutím mimo kalendára.
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open]);

  // Pri otvorení a pohybe klávesnicou ide fokus na zvolený deň v mriežke.
  useEffect(() => {
    if (!open || !focusGrid.current) return;
    focusGrid.current = false;
    gridRef.current?.querySelector<HTMLButtonElement>('[tabindex="0"]')?.focus();
  }, [open, focused]);

  // Hláška pre povinné pole a nesprávny dátum pri odoslaní formulára.
  useEffect(() => {
    inputRef.current?.setCustomValidity(invalid ? "Zadajte dátum v tvare 15. 1. 2027." : "");
  }, [invalid]);

  function commit(iso: string) {
    setValue(iso);
    setText(display(iso));
    setInvalid(false);
  }

  function openCalendar() {
    focusGrid.current = true;
    setFocused(selected ?? fromIso(parse(text) ?? "") ?? new Date());
    setOpen(true);
  }

  function close(returnFocus: boolean) {
    setOpen(false);
    if (returnFocus) toggleRef.current?.focus();
  }

  function onTextBlur() {
    if (!text.trim()) {
      setValue("");
      setInvalid(false);
      return;
    }
    const iso = parse(text);
    if (iso) commit(iso);
    else {
      setValue("");
      setInvalid(true);
    }
  }

  function onGridKey(e: KeyboardEvent) {
    const moves: Record<string, () => Date> = {
      ArrowLeft: () => addDays(focused, -1),
      ArrowRight: () => addDays(focused, 1),
      ArrowUp: () => addDays(focused, -7),
      ArrowDown: () => addDays(focused, 7),
      Home: () => addDays(focused, -weekdayIndex(focused)),
      End: () => addDays(focused, 6 - weekdayIndex(focused)),
      PageUp: () => addMonths(focused, e.shiftKey ? -12 : -1),
      PageDown: () => addMonths(focused, e.shiftKey ? 12 : 1),
    };
    if (moves[e.key]) {
      e.preventDefault();
      focusGrid.current = true;
      setFocused(moves[e.key]());
    }
  }

  const weeks = monthGrid(focused);
  const iconButton =
    "grid size-8 place-items-center rounded-field text-ink-soft transition-colors hover:bg-hover hover:text-ink";

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <input type="hidden" name={name} value={value} />
      <input
        ref={inputRef}
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="d. m. rrrr"
        value={text}
        required={required}
        disabled={disabled}
        onChange={(e) => {
          setText(e.target.value);
          if (invalid) setInvalid(false);
        }}
        onBlur={onTextBlur}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && e.altKey) {
            e.preventDefault();
            openCalendar();
          }
        }}
        aria-invalid={invalid || aria["aria-invalid"] || undefined}
        aria-describedby={aria["aria-describedby"]}
        className={cn("control pr-11 tabular-nums", size === "sm" && "control-sm")}
      />
      <button
        ref={toggleRef}
        type="button"
        disabled={disabled}
        onClick={() => (open ? close(false) : openCalendar())}
        aria-label={selected ? `Vybrať dátum, zvolený ${dayLabel.format(selected)}` : "Vybrať dátum z kalendára"}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? dialogId : undefined}
        className={cn(
          "absolute top-1/2 right-1 -translate-y-1/2 disabled:pointer-events-none disabled:opacity-50",
          iconButton,
          size === "sm" && "size-7",
          open && "bg-hover text-ink",
        )}
      >
        <svg viewBox="0 0 16 16" aria-hidden className="size-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <rect x="2.25" y="3.25" width="11.5" height="10.5" rx="1.5" />
          <path d="M2.25 6.75h11.5M5.25 1.75v3M10.75 1.75v3" />
        </svg>
      </button>

      {open ? (
        <div
          id={dialogId}
          role="dialog"
          aria-modal="false"
          aria-labelledby={titleId}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.stopPropagation();
              close(true);
            }
          }}
          className="absolute top-full right-0 z-40 mt-1.5 w-[18.5rem] rounded-panel border border-line bg-surface p-3 shadow-overlay"
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <button
              type="button"
              className={iconButton}
              aria-label="Predchádzajúci mesiac"
              onClick={() => setFocused(addMonths(focused, -1))}
            >
              <svg viewBox="0 0 16 16" aria-hidden className="size-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m10 4-4 4 4 4" />
              </svg>
            </button>
            <p id={titleId} aria-live="polite" className="text-sm font-semibold first-letter:uppercase">
              {monthLabel.format(focused)}
            </p>
            <button
              type="button"
              className={iconButton}
              aria-label="Nasledujúci mesiac"
              onClick={() => setFocused(addMonths(focused, 1))}
            >
              <svg viewBox="0 0 16 16" aria-hidden className="size-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m6 4 4 4-4 4" />
              </svg>
            </button>
          </div>

          <table ref={gridRef} role="grid" aria-labelledby={titleId} className="w-full border-collapse" onKeyDown={onGridKey}>
            <thead>
              <tr>
                {WEEKDAYS.map(([short, full]) => (
                  <th key={short} scope="col" abbr={full} className="h-8 text-center text-xs font-medium text-muted">
                    {short}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weeks.map((week) => (
                <tr key={toIso(week[0])}>
                  {week.map((day) => {
                    const outside = day.getMonth() !== focused.getMonth();
                    const isSelected = selected ? sameDay(day, selected) : false;
                    const isToday = sameDay(day, today);
                    const isFocused = sameDay(day, focused);
                    return (
                      <td key={toIso(day)} className="p-0.5 text-center">
                        <button
                          type="button"
                          tabIndex={isFocused ? 0 : -1}
                          aria-label={dayLabel.format(day)}
                          aria-pressed={isSelected}
                          aria-current={isToday ? "date" : undefined}
                          onClick={() => {
                            commit(toIso(day));
                            close(true);
                          }}
                          className={cn(
                            "relative grid h-9 w-full place-items-center rounded-field text-sm tabular-nums transition-colors",
                            isSelected
                              ? "bg-pine font-semibold text-white hover:bg-pine-hover"
                              : outside
                                ? "text-muted hover:bg-hover hover:text-ink"
                                : "text-ink hover:bg-hover",
                            isToday && !isSelected && "font-semibold text-pine",
                          )}
                        >
                          {day.getDate()}
                          {isToday ? (
                            <span
                              aria-hidden
                              className={cn(
                                "absolute bottom-1 left-1/2 h-0.5 w-3 -translate-x-1/2",
                                isSelected ? "bg-white" : "bg-pine",
                              )}
                            />
                          ) : null}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-2 flex items-center justify-between border-t border-line pt-2.5">
            <button
              type="button"
              className="h-8 rounded-field px-2 text-sm font-medium text-pine transition-colors hover:bg-pine-tint"
              onClick={() => {
                commit(toIso(new Date()));
                close(true);
              }}
            >
              Dnes
            </button>
            {value && !required ? (
              <button
                type="button"
                className="h-8 rounded-field px-2 text-sm font-medium text-ink-soft transition-colors hover:bg-hover hover:text-ink"
                onClick={() => {
                  commit("");
                  close(true);
                }}
              >
                Vymazať
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
