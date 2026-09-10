import type { TimetableInterval } from "./types";

/** 0 = Monday … 6 = Sunday (same as Massiva seed). */
export const WEEKDAY_OPTIONS = [
  { value: 0, label: "Po", full: "Pondelok" },
  { value: 1, label: "Ut", full: "Utorok" },
  { value: 2, label: "St", full: "Streda" },
  { value: 3, label: "Št", full: "Štvrtok" },
  { value: 4, label: "Pi", full: "Piatok" },
  { value: 5, label: "So", full: "Sobota" },
  { value: 6, label: "Ne", full: "Nedeľa" },
] as const;

export type TimeWindow = {
  id: string;
  start: string; // "HH:MM"
  end: string; // "HH:MM"
};

export function parseTimeToMinutes(value: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

export function formatMinutes(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function buildTimetable(
  weekdays: number[],
  windows: Array<{ start: string; end: string }>,
): TimetableInterval[] {
  const days = [...new Set(weekdays)].filter((d) => d >= 0 && d <= 6).sort();
  const intervals: TimetableInterval[] = [];

  for (const dayOfWeek of days) {
    for (const w of windows) {
      const startMinute = parseTimeToMinutes(w.start);
      const endMinute = parseTimeToMinutes(w.end);
      if (startMinute == null || endMinute == null) continue;
      if (endMinute <= startMinute) continue;
      intervals.push({ dayOfWeek, startMinute, endMinute });
    }
  }

  return intervals;
}

export function validateWindows(windows: Array<{ start: string; end: string }>) {
  if (windows.length < 1) return "Pridaj aspoň jedno časové okno.";
  for (const w of windows) {
    const start = parseTimeToMinutes(w.start);
    const end = parseTimeToMinutes(w.end);
    if (start == null || end == null) return "Neplatný čas (použi HH:MM).";
    if (end <= start) return "Koniec okna musí byť neskôr ako začiatok.";
  }
  return null;
}

export function summarizeTimetable(timetable: TimetableInterval[]): string[] {
  const byDay = new Map<number, TimetableInterval[]>();
  for (const row of timetable) {
    const list = byDay.get(row.dayOfWeek) ?? [];
    list.push(row);
    byDay.set(row.dayOfWeek, list);
  }

  return WEEKDAY_OPTIONS.filter((d) => byDay.has(d.value)).map((d) => {
    const windows = (byDay.get(d.value) ?? [])
      .slice()
      .sort((a, b) => a.startMinute - b.startMinute)
      .map((w) => `${formatMinutes(w.startMinute)}–${formatMinutes(w.endMinute)}`)
      .join(", ");
    return `${d.full}: ${windows}`;
  });
}

export function calendarDaysInclusive(startsAt: string, endsAt: string): number {
  const start = new Date(`${startsAt}T00:00:00`);
  const end = new Date(`${endsAt}T00:00:00`);
  const diff = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
  return Math.max(0, diff);
}

export function windowHours(windows: Array<{ start: string; end: string }>): number {
  let minutes = 0;
  for (const w of windows) {
    const start = parseTimeToMinutes(w.start);
    const end = parseTimeToMinutes(w.end);
    if (start == null || end == null || end <= start) continue;
    minutes += end - start;
  }
  return minutes / 60;
}
