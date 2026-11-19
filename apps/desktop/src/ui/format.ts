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

export const MOOD_LABELS: Record<Mood, { emoji: string; label: string }> = {
  great: { emoji: "😀", label: "Lief super" },
  ok: { emoji: "😐", label: "Ging so" },
  frustrated: { emoji: "😤", label: "Frustrierend" },
};

/** Kurze Vorschau: erste Zeilen ohne Code-Zäune. */
export function excerpt(body: string, max = 180): string {
  const text = body.replace(/```\w*/g, "").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}
