/**
 * Auswertungen über Einträge (Statistik-Karten, Heatmap).
 * Reine Funktionen: gleiche Eingabe → gleiches Ergebnis, ideal testbar.
 *
 * Kalendertage werden in der LOKALEN Zeitzone gebildet, denn "heute"
 * ist für den Nutzer sein eigener Tag, nicht der in UTC.
 */
import type { Entry } from "./entry";
import type { Timestamp } from "./types";

/** "2026-11-21" für den lokalen Kalendertag des Zeitpunkts. */
export function localDayKey(ts: Timestamp): string {
  const d = new Date(ts);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function active(entries: readonly Entry[]): Entry[] {
  return entries.filter((e) => e.deletedAt === null);
}

/** Anzahl Einträge pro Kalendertag – Grundlage der Heatmap. */
export function countEntriesPerDay(entries: readonly Entry[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const e of active(entries)) {
    const key = localDayKey(e.createdAt);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

export interface DevlogStats {
  readonly entries: number;
  /** Anzahl verschiedener Tags. */
  readonly skills: number;
  readonly totalMinutes: number;
  /** Aufeinanderfolgende Tage mit mindestens einem Eintrag, bis heute. */
  readonly streakDays: number;
}

/**
 * Die Serie zählt rückwärts ab heute. Hat man heute noch nichts eingetragen,
 * zählt sie ab gestern – sonst wäre jede Serie morgens erst mal "kaputt".
 */
export function computeStats(entries: readonly Entry[], now: Timestamp): DevlogStats {
  const list = active(entries);
  const days = new Set(list.map((e) => localDayKey(e.createdAt)));

  const cursor = new Date(now);
  if (!days.has(localDayKey(cursor.getTime()))) cursor.setDate(cursor.getDate() - 1);
  let streakDays = 0;
  // setDate statt "minus 24 h": bleibt auch bei Sommer-/Winterzeit korrekt.
  while (days.has(localDayKey(cursor.getTime()))) {
    streakDays++;
    cursor.setDate(cursor.getDate() - 1);
  }

  return {
    entries: list.length,
    skills: new Set(list.flatMap((e) => e.tags)).size,
    totalMinutes: list.reduce((sum, e) => sum + (e.durationMinutes ?? 0), 0),
    streakDays,
  };
}
