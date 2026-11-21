import type { Mood, Timestamp } from "@devlog/core";

const dayFormat = new Intl.DateTimeFormat("de-DE", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const timeFormat = new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit" });

function startOfDay(ts: Timestamp): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Schlüssel zum Gruppieren nach Kalendertag (lokale Zeit). */
export function dayKey(ts: Timestamp): number {
  return startOfDay(ts);
}

/** Beginn des folgenden Kalendertags (DST-sicher über setDate). */
export function nextDay(dayStart: Timestamp): Timestamp {
  const d = new Date(dayStart);
  d.setDate(d.getDate() + 1);
  return d.getTime();
}

const shortDate = new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
export function formatShortDate(ts: Timestamp): string {
  return shortDate.format(ts);
}

export function formatHours(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = minutes / 60;
  return `${hours.toLocaleString("de-DE", { maximumFractionDigits: 1 })} h`;
}

export function formatDayHeading(ts: Timestamp, now = Date.now()): string {
  const diffDays = Math.round((startOfDay(now) - startOfDay(ts)) / 86_400_000);
  if (diffDays === 0) return "Heute";
  if (diffDays === 1) return "Gestern";
  return dayFormat.format(ts);
}

export function formatTime(ts: Timestamp): string {
  return timeFormat.format(ts);
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

export const MOOD_LABELS: Record<Mood, { label: string }> = {
  great: { label: "Lief super" },
  ok: { label: "Ging so" },
  frustrated: { label: "Frustrierend" },
};

/** Kurze Vorschau: erste Zeilen ohne Code-Zäune. */
export function excerpt(body: string, max = 180): string {
  const text = body.replace(/```\w*/g, "").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}
