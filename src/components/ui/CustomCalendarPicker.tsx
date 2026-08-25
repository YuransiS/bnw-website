"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  X,
  Check
} from "lucide-react";

export interface DateRange {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
}

const MONTH_NAMES = [
  "Січень", "Лютий", "Березень", "Квітень", "Травень", "Червень",
  "Липень", "Серпень", "Вересень", "Жовтень", "Листопад", "Грудень"
];

const WEEKDAY_NAMES = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"];

const PRESETS = [
  { id: "today", label: "Сьогодні" },
  { id: "7d", label: "Останні 7 днів" },
  { id: "30d", label: "Останні 30 днів" },
  { id: "this_month", label: "Цей місяць" },
  { id: "last_month", label: "Минулий місяць" },
  { id: "this_year", label: "Поточний рік" },
  { id: "all", label: "Весь час" }
];

// Helper to format Date -> YYYY-MM-DD
const formatDateToISO = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

// Helper to format YYYY-MM-DD -> DD.MM.YYYY
export const formatDateToDisplay = (isoStr: string): string => {
  if (!isoStr) return "";
  const parts = isoStr.split("-");
  if (parts.length === 3) {
    return `${parts[2]}.${parts[1]}.${parts[0]}`;
  }
  return isoStr;
};

/**
 * Core Calendar Range Panel (Popover UI)
 */
interface CalendarRangePanelProps {
  startDate: string;
  endDate: string;
  onChange: (start: string, end: string) => void;
  onApply?: (start: string, end: string) => void;
  onClose?: () => void;
  isLight?: boolean;
}

export function CalendarRangePanel({
  startDate,
  endDate,
  onChange,
  onApply,
  onClose,
  isLight = false
}: CalendarRangePanelProps) {
  const [tempStart, setTempStart] = useState<string>(startDate || "");
  const [tempEnd, setTempEnd] = useState<string>(endDate || "");
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);

  const [currentYear, setCurrentYear] = useState<number>(() => {
    if (startDate) {
      const y = parseInt(startDate.split("-")[0]);
      if (!isNaN(y)) return y;
    }
    return new Date().getFullYear();
  });

  const [currentMonth, setCurrentMonth] = useState<number>(() => {
    if (startDate) {
      const m = parseInt(startDate.split("-")[1]) - 1;
      if (!isNaN(m)) return m;
    }
    return new Date().getMonth();
  });

  useEffect(() => {
    setTempStart(startDate || "");
    setTempEnd(endDate || "");
    if (startDate) {
      const [y, m] = startDate.split("-").map(Number);
      if (!isNaN(y) && !isNaN(m)) {
        setCurrentYear(y);
        setCurrentMonth(m - 1);
      }
    }
  }, [startDate, endDate]);

  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);

    let startDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const daysInMonth = lastDayOfMonth.getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    const days: Array<{
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
    }> = [];

    const todayStr = formatDateToISO(new Date());

    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevDate = new Date(currentYear, currentMonth - 1, dayNum);
      const dateStr = formatDateToISO(prevDate);
      days.push({
        dateStr,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: dateStr === todayStr
      });
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const currDate = new Date(currentYear, currentMonth, i);
      const dateStr = formatDateToISO(currDate);
      days.push({
        dateStr,
        dayNumber: i,
        isCurrentMonth: true,
        isToday: dateStr === todayStr
      });
    }

    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const nextDate = new Date(currentYear, currentMonth + 1, i);
      const dateStr = formatDateToISO(nextDate);
      days.push({
        dateStr,
        dayNumber: i,
        isCurrentMonth: false,
        isToday: dateStr === todayStr
      });
    }

    return days;
  }, [currentYear, currentMonth]);

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((prev) => prev - 1);
    } else {
      setCurrentMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((prev) => prev + 1);
    } else {
      setCurrentMonth((prev) => prev + 1);
    }
  };

  const handleDayClick = (dateStr: string) => {
    if (!tempStart || (tempStart && tempEnd)) {
      setTempStart(dateStr);
      setTempEnd("");
    } else if (tempStart && !tempEnd) {
      if (dateStr < tempStart) {
        setTempEnd(tempStart);
        setTempStart(dateStr);
        onChange(dateStr, tempStart);
      } else {
        setTempEnd(dateStr);
        onChange(tempStart, dateStr);
      }
    }
  };

  const handlePresetSelect = (presetId: string) => {
    const today = new Date();
    let s = "";
    let e = formatDateToISO(today);

    if (presetId === "today") {
      s = formatDateToISO(today);
      e = s;
    } else if (presetId === "7d") {
      const past = new Date(today);
      past.setDate(today.getDate() - 6);
      s = formatDateToISO(past);
    } else if (presetId === "30d") {
      const past = new Date(today);
      past.setDate(today.getDate() - 29);
      s = formatDateToISO(past);
    } else if (presetId === "this_month") {
      const y = today.getFullYear();
      const m = today.getMonth();
      s = `${y}-${String(m + 1).padStart(2, "0")}-01`;
      const lastDay = new Date(y, m + 1, 0).getDate();
      e = `${y}-${String(m + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    } else if (presetId === "last_month") {
      const y = today.getFullYear();
      const m = today.getMonth() - 1;
      const prevMonthDate = new Date(y, m, 1);
      const prevYear = prevMonthDate.getFullYear();
      const prevMonth = prevMonthDate.getMonth();
      s = `${prevYear}-${String(prevMonth + 1).padStart(2, "0")}-01`;
      const lastDay = new Date(prevYear, prevMonth + 1, 0).getDate();
      e = `${prevYear}-${String(prevMonth + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    } else if (presetId === "this_year") {
      const y = today.getFullYear();
      s = `${y}-01-01`;
      e = `${y}-12-31`;
    } else if (presetId === "all") {
      s = "2024-01-01";
      e = formatDateToISO(today);
    }

    setTempStart(s);
    setTempEnd(e);
    if (s) {
      const [y, m] = s.split("-").map(Number);
      if (!isNaN(y) && !isNaN(m)) {
        setCurrentYear(y);
        setCurrentMonth(m - 1);
      }
    }
    onChange(s, e);
  };

  const handleApply = () => {
    const finalStart = tempStart || startDate;
    const finalEnd = tempEnd || tempStart || endDate;
    onChange(finalStart, finalEnd);
    if (onApply) {
      onApply(finalStart, finalEnd);
    }
    if (onClose) {
      onClose();
    }
  };

  const handleClear = () => {
    setTempStart("");
    setTempEnd("");
    onChange("", "");
    if (onApply) {
      onApply("", "");
    }
    if (onClose) {
      onClose();
    }
  };

  const isDateSelected = (dateStr: string) => dateStr === tempStart || dateStr === tempEnd;

  const isDateInRange = (dateStr: string) => {
    if (tempStart && tempEnd) {
      return dateStr > tempStart && dateStr < tempEnd;
    }
    if (tempStart && !tempEnd && hoveredDate) {
      const min = tempStart < hoveredDate ? tempStart : hoveredDate;
      const max = tempStart < hoveredDate ? hoveredDate : tempStart;
      return dateStr > min && dateStr < max;
    }
    return false;
  };

  const isRangeStart = (dateStr: string) => {
    if (tempStart && tempEnd) return dateStr === tempStart;
    if (tempStart && !tempEnd && hoveredDate) {
      return dateStr === (tempStart < hoveredDate ? tempStart : hoveredDate);
    }
    return dateStr === tempStart;
  };

  const isRangeEnd = (dateStr: string) => {
    if (tempStart && tempEnd) return dateStr === tempEnd;
    if (tempStart && !tempEnd && hoveredDate) {
      return dateStr === (tempStart < hoveredDate ? hoveredDate : tempStart);
    }
    return false;
  };

  return (
    <div
      className={`rounded-2xl shadow-2xl border p-4 w-[340px] sm:w-[460px] animate-in fade-in zoom-in-95 duration-150 ${
        isLight
          ? "bg-white border-neutral-200 text-neutral-900 shadow-neutral-200/50"
          : "bg-[#0C0C0F] border-white/15 text-white shadow-black/80 backdrop-blur-xl"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-3">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
            title="Попередній місяць"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="text-xs font-black uppercase tracking-wider text-white px-1">
            {MONTH_NAMES[currentMonth]} {currentYear}
          </span>

          <button
            type="button"
            onClick={handleNextMonth}
            className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
            title="Наступний місяць"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Year Selector */}
        <div className="flex items-center gap-1">
          <select
            value={currentYear}
            onChange={(e) => setCurrentYear(Number(e.target.value))}
            className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-[11px] font-bold text-white cursor-pointer focus:outline-none focus:border-emerald-500"
          >
            {[2024, 2025, 2026, 2027].map((yr) => (
              <option key={yr} value={yr} className="bg-[#0C0C0F] text-white">
                {yr}
              </option>
            ))}
          </select>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-all cursor-pointer ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3">
        {/* Left: Quick Presets */}
        <div className="space-y-1 sm:border-r sm:border-white/5 sm:pr-3">
          <span className="text-[9px] font-black uppercase text-white/30 tracking-widest block mb-2">
            Швидкі пресети:
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-1 gap-1">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handlePresetSelect(p.id)}
                className="w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-white/60 hover:text-white hover:bg-white/5 transition-all cursor-pointer truncate"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Center/Right: Calendar Grid */}
        <div className="sm:col-span-2 space-y-2">
          <div className="grid grid-cols-7 text-center">
            {WEEKDAY_NAMES.map((wd) => (
              <span key={wd} className="text-[10px] font-black uppercase text-white/30 py-1">
                {wd}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-y-1 text-center" onMouseLeave={() => setHoveredDate(null)}>
            {calendarDays.map((day, idx) => {
              const isSelected = isDateSelected(day.dateStr);
              const inRange = isDateInRange(day.dateStr);
              const isStart = isRangeStart(day.dateStr);
              const isEnd = isRangeEnd(day.dateStr);

              let btnStyle = "text-white/80 hover:bg-white/10 hover:text-white";
              let bgContainer = "";

              if (!day.isCurrentMonth) {
                btnStyle = "text-white/20 hover:text-white/40";
              }

              if (inRange) {
                bgContainer = "bg-emerald-500/15";
                btnStyle = "text-emerald-300 font-bold";
              }

              if (isSelected || isStart || isEnd) {
                btnStyle = "bg-emerald-500 text-black font-black shadow-md shadow-emerald-500/20";
                if (isStart && isEnd) {
                  bgContainer = "rounded-lg";
                } else if (isStart) {
                  bgContainer = "rounded-l-lg bg-emerald-500/20";
                } else if (isEnd) {
                  bgContainer = "rounded-r-lg bg-emerald-500/20";
                }
              } else if (day.isToday) {
                btnStyle += " ring-1 ring-emerald-500/40 text-emerald-400";
              }

              return (
                <div key={idx} className={`p-0.5 relative ${bgContainer}`}>
                  <button
                    type="button"
                    onClick={() => handleDayClick(day.dateStr)}
                    onMouseEnter={() => setHoveredDate(day.dateStr)}
                    className={`w-8 h-8 mx-auto rounded-lg text-xs flex items-center justify-center transition-all cursor-pointer ${btnStyle}`}
                  >
                    {day.dayNumber}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/5 pt-3 mt-3">
        <div className="text-[11px] font-mono text-white/60">
          {tempStart ? formatDateToDisplay(tempStart) : "—"}
          {" — "}
          {tempEnd ? formatDateToDisplay(tempEnd) : tempStart ? formatDateToDisplay(tempStart) : "—"}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleClear}
            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white text-xs font-bold transition-all cursor-pointer"
          >
            Очистити
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-emerald-500/20"
          >
            Застосувати
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Standalone Dropdown Calendar Trigger
 */
interface CustomCalendarPickerProps {
  startDate: string;
  endDate: string;
  onChange: (start: string, end: string) => void;
  onApply?: (start: string, end: string) => void;
  className?: string;
  placeholder?: string;
  align?: "left" | "right";
  isLight?: boolean;
}

export default function CustomCalendarPicker({
  startDate,
  endDate,
  onChange,
  onApply,
  className = "",
  placeholder = "Виберіть період...",
  align = "left",
  isLight = false
}: CustomCalendarPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const displayTriggerText = useMemo(() => {
    if (startDate && endDate) {
      if (startDate === endDate) {
        return formatDateToDisplay(startDate);
      }
      return `${formatDateToDisplay(startDate)} — ${formatDateToDisplay(endDate)}`;
    }
    if (startDate) return `Від ${formatDateToDisplay(startDate)}`;
    if (endDate) return `До ${formatDateToDisplay(endDate)}`;
    return placeholder;
  }, [startDate, endDate, placeholder]);

  return (
    <div className={`relative inline-block ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-2 select-none shadow-sm ${
          isOpen
            ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
            : isLight
            ? "border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-800"
            : "border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 text-white/90"
        }`}
      >
        <CalendarIcon className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        <span className="truncate">{displayTriggerText}</span>
      </button>

      {isOpen && (
        <div className={`absolute top-full mt-2 z-[9999] ${align === "right" ? "right-0" : "left-0"}`}>
          <CalendarRangePanel
            startDate={startDate}
            endDate={endDate}
            onChange={onChange}
            onApply={(s, e) => {
              if (onApply) onApply(s, e);
              setIsOpen(false);
            }}
            onClose={() => setIsOpen(false)}
            isLight={isLight}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Custom Date Input Pair Component
 * "ВІД: ДД.ММ.РРРР 📅" / "ДО: ДД.ММ.РРРР 📅"
 */
interface CustomDateRangeInputsProps {
  startDate: string;
  endDate: string;
  onChange: (start: string, end: string) => void;
  onApply?: () => void;
  isLight?: boolean;
  className?: string;
}

export function CustomDateRangeInputs({
  startDate,
  endDate,
  onChange,
  onApply,
  isLight = false,
  className = ""
}: CustomDateRangeInputsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div className={`relative flex items-center gap-2 flex-wrap ${className}`} ref={containerRef}>
      {/* Start Date Box */}
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] uppercase font-bold text-white/40">Від:</span>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`bg-black/50 hover:bg-black/70 border rounded-xl px-3 py-1.5 text-white text-xs font-mono font-semibold flex items-center gap-2 transition-all cursor-pointer ${
            isOpen ? "border-emerald-500/60 shadow-lg shadow-emerald-500/10" : "border-white/10 hover:border-emerald-500/40"
          }`}
        >
          <span>{startDate ? formatDateToDisplay(startDate) : "ДД.ММ.РРРР"}</span>
          <CalendarIcon className="w-3.5 h-3.5 text-emerald-400 opacity-70" />
        </button>
      </div>

      {/* End Date Box */}
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] uppercase font-bold text-white/40">До:</span>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`bg-black/50 hover:bg-black/70 border rounded-xl px-3 py-1.5 text-white text-xs font-mono font-semibold flex items-center gap-2 transition-all cursor-pointer ${
            isOpen ? "border-emerald-500/60 shadow-lg shadow-emerald-500/10" : "border-white/10 hover:border-emerald-500/40"
          }`}
        >
          <span>{endDate ? formatDateToDisplay(endDate) : "ДД.ММ.РРРР"}</span>
          <CalendarIcon className="w-3.5 h-3.5 text-emerald-400 opacity-70" />
        </button>
      </div>

      {/* Apply Button */}
      {onApply && (
        <button
          type="button"
          onClick={onApply}
          className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs rounded-xl cursor-pointer transition-all shadow-md shadow-emerald-500/20"
        >
          Застосувати
        </button>
      )}

      {/* Directly mount CalendarRangePanel without any intermediate button! */}
      {isOpen && (
        <div className="absolute top-full mt-2 left-0 z-[9999]">
          <CalendarRangePanel
            startDate={startDate}
            endDate={endDate}
            onChange={onChange}
            onApply={(s, e) => {
              onChange(s, e);
              setIsOpen(false);
              if (onApply) onApply();
            }}
            onClose={() => setIsOpen(false)}
            isLight={isLight}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Single Date Picker Component
 */
interface SingleDatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (date: string) => void;
  placeholder?: string;
  className?: string;
  isLight?: boolean;
  align?: "left" | "right";
  required?: boolean;
}

export function SingleDatePicker({
  value,
  onChange,
  placeholder = "Виберіть дату...",
  className = "",
  isLight = false,
  align = "left",
  required = false
}: SingleDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const [currentYear, setCurrentYear] = useState<number>(() => {
    if (value) {
      const y = parseInt(value.split("-")[0]);
      if (!isNaN(y)) return y;
    }
    return new Date().getFullYear();
  });

  const [currentMonth, setCurrentMonth] = useState<number>(() => {
    if (value) {
      const m = parseInt(value.split("-")[1]) - 1;
      if (!isNaN(m)) return m;
    }
    return new Date().getMonth();
  });

  useEffect(() => {
    if (value) {
      const [y, m] = value.split("-").map(Number);
      if (!isNaN(y) && !isNaN(m)) {
        setCurrentYear(y);
        setCurrentMonth(m - 1);
      }
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);

    let startDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const daysInMonth = lastDayOfMonth.getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    const days: Array<{
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
    }> = [];

    const todayStr = formatDateToISO(new Date());

    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevDate = new Date(currentYear, currentMonth - 1, dayNum);
      const dateStr = formatDateToISO(prevDate);
      days.push({
        dateStr,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: dateStr === todayStr
      });
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const currDate = new Date(currentYear, currentMonth, i);
      const dateStr = formatDateToISO(currDate);
      days.push({
        dateStr,
        dayNumber: i,
        isCurrentMonth: true,
        isToday: dateStr === todayStr
      });
    }

    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const nextDate = new Date(currentYear, currentMonth + 1, i);
      const dateStr = formatDateToISO(nextDate);
      days.push({
        dateStr,
        dayNumber: i,
        isCurrentMonth: false,
        isToday: dateStr === todayStr
      });
    }

    return days;
  }, [currentYear, currentMonth]);

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((prev) => prev - 1);
    } else {
      setCurrentMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((prev) => prev + 1);
    } else {
      setCurrentMonth((prev) => prev + 1);
    }
  };

  const handleDaySelect = (dateStr: string) => {
    onChange(dateStr);
    setIsOpen(false);
  };

  return (
    <div className={`relative inline-block ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-3 py-2 rounded-xl border text-xs font-mono font-semibold transition-all cursor-pointer flex items-center justify-between gap-2 shadow-sm ${
          isOpen
            ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
            : isLight
            ? "border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-800"
            : "border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 text-white/90"
        }`}
      >
        <span className="truncate">{value ? formatDateToDisplay(value) : placeholder}</span>
        <CalendarIcon className="w-3.5 h-3.5 text-emerald-400 opacity-70 shrink-0" />
      </button>

      {isOpen && (
        <div
          className={`absolute top-full mt-2 z-[9999] rounded-2xl shadow-2xl border p-4 w-[290px] sm:w-[320px] animate-in fade-in zoom-in-95 duration-150 ${
            align === "right" ? "right-0" : "left-0"
          } ${
            isLight
              ? "bg-white border-neutral-200 text-neutral-900 shadow-neutral-200/50"
              : "bg-[#0C0C0F] border-white/15 text-white shadow-black/80 backdrop-blur-xl"
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1 rounded-lg text-white/50 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="text-xs font-black uppercase tracking-wider text-white px-1">
                {MONTH_NAMES[currentMonth]} {currentYear}
              </span>

              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1 rounded-lg text-white/50 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 text-center pt-2">
            {WEEKDAY_NAMES.map((wd) => (
              <span key={wd} className="text-[10px] font-black uppercase text-white/30 py-1">
                {wd}
              </span>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 gap-y-1 text-center pt-1">
            {calendarDays.map((day, idx) => {
              const isSelected = day.dateStr === value;
              let btnStyle = "text-white/80 hover:bg-white/10 hover:text-white";

              if (!day.isCurrentMonth) {
                btnStyle = "text-white/20 hover:text-white/40";
              }

              if (isSelected) {
                btnStyle = "bg-emerald-500 text-black font-black shadow-md shadow-emerald-500/20";
              } else if (day.isToday) {
                btnStyle += " ring-1 ring-emerald-500/40 text-emerald-400";
              }

              return (
                <div key={idx} className="p-0.5">
                  <button
                    type="button"
                    onClick={() => handleDaySelect(day.dateStr)}
                    className={`w-8 h-8 mx-auto rounded-lg text-xs flex items-center justify-center transition-all cursor-pointer ${btnStyle}`}
                  >
                    {day.dayNumber}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Quick today select */}
          <div className="flex items-center justify-between border-t border-white/5 pt-2.5 mt-2.5">
            <button
              type="button"
              onClick={() => handleDaySelect(formatDateToISO(new Date()))}
              className="text-[11px] font-bold text-emerald-400 hover:underline cursor-pointer"
            >
              Сьогодні
            </button>
            {!required && value && (
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setIsOpen(false);
                }}
                className="text-[11px] font-bold text-red-400 hover:underline cursor-pointer"
              >
                Очистити
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


