"use client";

import React, { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/hooks/use-translation";

export interface DateInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  value?: string; // ISO yyyy-mm-dd
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  allowPastDates?: boolean;
}

function formatISO(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseISO(value?: string) {
  if (!value) return null;
  const parts = value.split("-");
  if (parts.length !== 3) return null;
  const [y, m, d] = parts.map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

export const DateInput: React.FC<DateInputProps> = ({
  value,
  onChange,
  className,
  placeholder,
  allowPastDates = false,
  ...rest
}) => {
  const { t, language } = useTranslation();
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState<Date>(
    () => parseISO(value) || new Date()
  );
  // visible text inside the input (dd/mm/yyyy for Europe)
  const [inputValue, setInputValue] = useState<string>(() => {
    const d = parseISO(value);
    return d ? formatDisplay(d) : (value || "");
  });
  const [isBelow, setIsBelow] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const parsed = parseISO(value);
    setViewDate(parsed || new Date());
    // update visible input when parent value changes
    if (parsed) setInputValue(formatDisplay(parsed));
    else if (!value) setInputValue("");
  }, [value]);

  useEffect(() => {
    function checkSpace() {
      if (inputRef.current) {
        const rect = inputRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const dropdownHeight = 200;
        setIsBelow(spaceBelow > dropdownHeight);
      }
    }

    checkSpace();
    window.addEventListener("resize", checkSpace);
    window.addEventListener("scroll", checkSpace);
    return () => {
      window.removeEventListener("resize", checkSpace);
      window.removeEventListener("scroll", checkSpace);
    };
  }, [open]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const startOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  // make week start on Monday: shift JS getDay() (0=Sun) to Monday-first (0=Mon)
  const startWeekday = (startOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(
    viewDate.getFullYear(),
    viewDate.getMonth() + 1,
    0
  ).getDate();

  const prevMonth = () =>
    setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () =>
    setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  const pickDate = (day: number) => {
    const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    // do not allow picking past dates (unless allowPastDates is set)
    if (!allowPastDates) {
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      if (newDate < todayStart) {
        setError(t?.("invalidDate") || "invalidDate");
        return;
      }
    }
    const iso = formatISO(newDate);
    if (onChange) {
      const ev = {
        target: { value: iso },
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      onChange(ev);
    }
    // update visible text to dd/mm/yyyy
    setInputValue(formatDisplay(newDate));
    setError(null);
    setOpen(false);
  };

  const monthLabel =
    t?.(
      [
        "january",
        "february",
        "march",
        "april",
        "may",
        "june",
        "july",
        "august",
        "september",
        "october",
        "november",
        "december",
      ][viewDate.getMonth()]
    ) || viewDate.toLocaleString(language, { month: "long" });

  // original keys are Sunday-first; translate then reorder to Monday-first
  const originalWeekDays = ["sunx","monx", "tuex", "wedx", "thux", "frix", "satx"].map((k) => t(k));
  const weekDays = [originalWeekDays[1], originalWeekDays[2], originalWeekDays[3], originalWeekDays[4], originalWeekDays[5], originalWeekDays[6], originalWeekDays[0]];

  const cells: Array<Array<number | null>> = [];
  let week: Array<number | null> = [];
  for (let i = 0; i < startWeekday; i++) week.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    week.push(d);
    if (week.length === 7) {
      cells.push(week);
      week = [];
    }
  }
  if (week.length) {
    while (week.length < 7) week.push(null);
    cells.push(week);
  }

  const displayValue = inputValue;

  // Helpers to parse/display dd/mm/yyyy from manual input
  function formatDisplay(date: Date) {
    const d = String(date.getDate()).padStart(2, "0");
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
  }

  function tryParseInputToISO(raw: string): string | null {
    if (!raw) return null;
    const s = raw.trim();
    // dd/mm/yyyy or d/m/yy
    const dm = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if (dm) {
      let day = Number(dm[1]);
      let month = Number(dm[2]);
      let year = Number(dm[3]);
      if (year < 100) year += 2000;
      // explicit validation: day 1-31, month 1-12
      if (month < 1 || month > 12) return null;
      if (day < 1 || day > 31) return null;
      // create date and ensure it matches (catches invalid day/month combos like 31/02)
      const dateObj = new Date(year, month - 1, day);
      if (
        dateObj &&
        dateObj.getFullYear() === year &&
        dateObj.getMonth() === month - 1 &&
        dateObj.getDate() === day
      ) {
        return formatISO(dateObj);
      }
      return null;
    }
    // ISO yyyy-mm-dd
    const iso = parseISO(s);
    if (iso) return formatISO(iso);
    return null;
  }

  // format input as dd/mm/yyyy while typing (allow only digits and auto-insert slashes)
  function formatAsYouType(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, 8); // ddmmyyyy max
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
  }

  // parse day/month/year from a raw dd/mm/yyyy-ish string
  function parseDMY(raw: string): { day: number; month: number; year: number } | null {
    const s = raw.trim();
    const dm = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if (!dm) return null;
    let day = Number(dm[1]);
    let month = Number(dm[2]);
    let year = Number(dm[3]);
    if (year < 100) year += 2000;
    return { day, month, year };
  }

  function validateDMY(day: number, month: number, year: number): string | null {
    if (day < 1 || day > 31) return t("invalidDay") || "Day must be between 1 and 31";
    if (month < 1 || month > 12) return t("invalidMonth") || "Month must be between 1 and 12";
    // check year in selectable range
    const minYear = years[0];
    const maxYear = years[years.length - 1];
    if (year < minYear || year > maxYear)
      return (
        t?.("invalidYear") ||
        `Year must be between ${minYear} and ${maxYear}`
      );
    // also ensure the specific day exists for that month/year (e.g., 31/02)
    const dateObj = new Date(year, month - 1, day);
    if (
      !(dateObj.getFullYear() === year && dateObj.getMonth() === month - 1 && dateObj.getDate() === day)
    ) {
      return t?.("invalidDate") || "Invalid date for given month/year";
    }
    // disallow past dates (must be today or in the future) unless allowPastDates
    if (!allowPastDates) {
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      if (dateObj < todayStart) return t?.("invalidDate") || "invalidDate";
    }
    return null;
  }

  // Add year and month dropdowns
  const currentYear = viewDate.getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => currentYear - 50 + i);
  const months = Array.from({ length: 12 }, (_, i) => i);

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newYear = parseInt(e.target.value, 10);
    setViewDate(new Date(newYear, viewDate.getMonth(), 1));
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMonth = parseInt(e.target.value, 10);
    setViewDate(new Date(viewDate.getFullYear(), newMonth, 1));
  };

  return (
    <div className="relative w-full" ref={ref}>
      {/* input + icon wrapper: keep fixed min-h so error text below won't push the icon */}
      <div className="relative w-full">
        <div className="relative w-full" style={{ minHeight: 40 }}>
          <Input
          ref={inputRef}
          value={displayValue}
          onChange={(e) => {
            const el = e.target as HTMLInputElement;
            const raw = el.value;
            // Find how many digits are before the caret in the previous value
            const prev = inputRef.current ? inputRef.current.value : displayValue;
            const prevPos = el.selectionStart ?? prev.length;

            function countDigitsBefore(str: string, pos: number) {
              let cnt = 0;
              for (let i = 0; i < Math.min(pos, str.length); i++) if (/[0-9]/.test(str[i])) cnt++;
              return cnt;
            }

            const digitsBefore = countDigitsBefore(prev, prevPos);
            const newFormatted = formatAsYouType(raw);

            // Find caret position in newFormatted that corresponds to same number of digits
            function findPosForDigits(str: string, digitsTarget: number) {
              let cnt = 0;
              for (let i = 0; i < str.length; i++) {
                if (/[0-9]/.test(str[i])) cnt++;
                if (cnt === digitsTarget) return i + 1; // caret after this digit
              }
              return str.length;
            }

            const newPos = findPosForDigits(newFormatted, digitsBefore);

            setInputValue(newFormatted);
            // restore caret after state update
            setTimeout(() => {
              if (inputRef.current) {
                try {
                  inputRef.current.selectionStart = newPos;
                  inputRef.current.selectionEnd = newPos;
                } catch (e) {
                  // ignore
                }
              }
            }, 0);

            // Per-field validation while typing (show immediate feedback)
            // newFormatted looks like: "", "1", "12", "12/", "12/3", "12/03/2020" etc.
            const partial = newFormatted.match(/^(\d{1,2})(?:\/(\d{1,2}))?(?:\/(\d{2,4}))?$/);
            if (partial) {
              const dStr = partial[1];
              const mStr = partial[2];
              const yStr = partial[3];

              // Validate day when two digits entered for day
              if (dStr && dStr.length === 2) {
                const dayNum = Number(dStr);
                if (dayNum < 1 || dayNum > 31) {
                  setError(t?.("invalidDay") || "Day must be between 1 and 31");
                  return;
                }
              }

              // Validate month when two digits entered for month
              if (mStr && mStr.length === 2) {
                const monthNum = Number(mStr);
                if (monthNum < 1 || monthNum > 12) {
                  setError(t?.("invalidMonth") || "Month must be between 1 and 12");
                  return;
                }
              }

              // Validate year when user entered >=2 digits (allow 2-digit years)
              if (yStr && yStr.length >= 2) {
                let yearNum = Number(yStr);
                if (yStr.length === 2) yearNum += 2000;
                const minYear = years[0];
                const maxYear = years[years.length - 1];
                if (yearNum < minYear || yearNum > maxYear) {
                  setError(t?.("invalidYear") || `Year must be between ${minYear} and ${maxYear}`);
                  return;
                }

                // If day and month are present, ensure the full date is valid
                if (dStr && mStr) {
                  const dayNum = Number(dStr);
                  const monthNum = Number(mStr);
                  const dateObj = new Date(yearNum, monthNum - 1, dayNum);
                  if (
                    !(dateObj.getFullYear() === yearNum && dateObj.getMonth() === monthNum - 1 && dateObj.getDate() === dayNum)
                  ) {
                    setError(t?.("invalidDate") || "Invalid date for given month/year");
                    return;
                  }
                  // disallow past dates unless allowPastDates
                  if (!allowPastDates) {
                    const today = new Date();
                    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                    if (dateObj < todayStart) {
                      setError(t?.("invalidDate") || "invalidDate");
                      return;
                    }
                  }
                }
              }

              // no error found for current partial input
              if (error) setError(null);
            } else {
              // Not matching partial numeric pattern (user typed extra chars) - clear error to avoid blocking typing
              if (error) setError(null);
            }
          }}
          onBlur={(e) => {
            const raw = e.target.value;
            const iso = tryParseInputToISO(raw);
            if (iso && onChange) {
              const ev = { target: { value: iso } } as unknown as React.ChangeEvent<HTMLInputElement>;
              onChange(ev);
              setError(null);
            } else if (!raw) {
              // User cleared the field: propagate empty value to parent so the
              // form state does not keep the previous date.
              if (onChange) {
                const ev = { target: { value: "" } } as unknown as React.ChangeEvent<HTMLInputElement>;
                onChange(ev);
              }
              setError(null);
            } else if (raw) {
              // attempt to provide a helpful validation message
              const parsed = parseDMY(raw);
              if (parsed) {
                const v = validateDMY(parsed.day, parsed.month, parsed.year);
                setError(v);
              } else {
                setError(t?.("invalidDateFormat") || "Invalid date format");
              }
            }
            // if parsed, normalize visible format, otherwise leave user text
            if (iso) setInputValue(formatDisplay(parseISO(iso)!));
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const raw = (e.target as HTMLInputElement).value;
              const iso = tryParseInputToISO(raw);
              if (iso && onChange) {
                const ev = { target: { value: iso } } as unknown as React.ChangeEvent<HTMLInputElement>;
                onChange(ev);
                setInputValue(formatDisplay(parseISO(iso)!));
                setError(null);
                setOpen(false);
              } else {
                // show validation
                const parsed = parseDMY(raw);
                if (parsed) setError(validateDMY(parsed.day, parsed.month, parsed.year));
                else setError(t?.("invalidDateFormat") || "Invalid date format");
              }
            }
          }}
          inputMode="numeric"
          pattern="\\d{2}/\\d{2}/\\d{4}"
          maxLength={10}
          className={`pr-12 ${className}`}
          aria-invalid={!!error}
          placeholder={placeholder || t?.("datePlaceholder") || "dd/mm/aaaa"}
          aria-label={placeholder || t?.("datePlaceholder") || "dd/mm/aaaa"}
          {...(rest as any)}
        />
          <button
          type="button"
          onClick={() => setOpen((s) => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground p-1"
          aria-label={t("toggleCalendar") || "Toggle calendar"}
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </button>
        </div>
      </div>
      {error && (
        <div className="text-xs text-red-600 mt-1" role="alert">
          {error}
        </div>
      )}

{open && (
  <div
    className="absolute z-50 w-40 rounded-md border border-border bg-background p-1 shadow-md 
               text-[11px] leading-tight"   /* ↓ overall smaller text */
    style={{
      top: isBelow ? "100%" : "auto",
      bottom: isBelow ? "auto" : "100%",
      marginTop: isBelow ? "0.25rem" : "0",
      marginBottom: isBelow ? "0" : "0.25rem",
    }}
  >
    <div className="flex items-center justify-between mb-1"> {/* ↓ tighter bottom margin */}
      <select
        value={viewDate.getFullYear()}
        onChange={handleYearChange}
        className="rounded px-1 py-0 text-[11px] bg-background border border-border hover:bg-muted"
      >
        {years.map((year) => (
          <option key={year} value={year}>{year}</option>
        ))}
      </select>
      <select
        value={viewDate.getMonth()}
        onChange={handleMonthChange}
        className="rounded px-1 py-0 text-[11px] bg-background border border-border hover:bg-muted"
      >
        {months.map((month) => (
          <option key={month} value={month}>
            {t?.(
              [
                "january","february","march","april","may","june",
                "july","august","september","october","november","december"
              ][month]
            ) || new Date(0, month).toLocaleString(language,{ month: "long" })}
          </option>
        ))}
      </select>
    </div>

    <div className="grid grid-cols-7 gap-0 text-center text-[10px] font-medium text-muted-foreground mb-1">
      {weekDays.map((wd, idx) => (
        <div key={idx} className="text-center">{wd.charAt(0)}</div>
      ))}
    </div>

    <div className="grid grid-cols-7 gap-0 text-[11px]">
      {cells.flat().map((d, idx) => {
        if (d === null) return <div key={idx} className="h-4" />; {/* ↓ smaller height */}
        const isSelected =
          value === formatISO(new Date(viewDate.getFullYear(), viewDate.getMonth(), d));
        const isToday =
          formatISO(new Date()) ===
          formatISO(new Date(viewDate.getFullYear(), viewDate.getMonth(), d));
        return (
          <button
            key={idx}
            type="button"
            onClick={() => pickDate(d)}
            className={`h-5 w-5 flex items-center justify-center rounded-full transition-colors ${
              isSelected
                ? "bg-primary text-primary-foreground"
                : isToday
                ? "bg-gray-400 text-white"
                : "hover:bg-muted text-foreground"
            }`}
          >
            {d}
          </button>
        );
      })}
    </div>
  </div>
)}

    </div>
  );
};

export default DateInput;
