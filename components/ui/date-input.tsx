"use client";

import React, { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/hooks/use-translation";

export interface DateInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  value?: string; // ISO yyyy-mm-dd
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
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
    const iso = formatISO(newDate);
    if (onChange) {
      const ev = {
        target: { value: iso },
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      onChange(ev);
    }
    // update visible text to dd/mm/yyyy
    setInputValue(formatDisplay(newDate));
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
      const dateObj = new Date(year, month - 1, day);
      if (dateObj && dateObj.getFullYear() === year && dateObj.getMonth() === month - 1 && dateObj.getDate() === day) {
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
    <div className="relative inline-block" ref={ref}>
      <div className="relative w-full">
        <Input
          ref={inputRef}
          value={displayValue}
          onChange={(e) => {
            setInputValue(formatAsYouType(e.target.value));
          }}
          onBlur={(e) => {
            const iso = tryParseInputToISO(e.target.value);
            if (iso && onChange) {
              const ev = { target: { value: iso } } as unknown as React.ChangeEvent<HTMLInputElement>;
              onChange(ev);
            }
            // if parsed, normalize visible format, otherwise leave user text
            if (iso) setInputValue(formatDisplay(parseISO(iso)!));
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const iso = tryParseInputToISO((e.target as HTMLInputElement).value);
              if (iso && onChange) {
                const ev = { target: { value: iso } } as unknown as React.ChangeEvent<HTMLInputElement>;
                onChange(ev);
                setInputValue(formatDisplay(parseISO(iso)!));
                setOpen(false);
              }
            }
          }}
          inputMode="numeric"
          pattern="\d{2}/\d{2}/\d{4}"
          maxLength={10}
          className={`pr-12 ${className}`}
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
