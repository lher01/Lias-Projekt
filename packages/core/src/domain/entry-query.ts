import type { Entry } from "./entry";
import type { Tag } from "./tag";
import type { ProjectId, Timestamp } from "./types";

/**
 * Beschreibt *was* gesucht wird, nicht *wie*. Ein SQLite-Adapter kann das
 * später in SQL (inkl. Volltextsuche) übersetzen, der In-Memory-Adapter
 * nutzt einfach `matchesQuery`.
 */
export interface EntryQuery {
  readonly projectId?: ProjectId;
  readonly tag?: Tag;
  /** Volltextsuche über Titel, Text, "Gelernt" und Tags (Groß/Klein egal). */
  readonly text?: string;
  /** Einschließlich (>=). */
  readonly from?: Timestamp;
  /** Ausschließlich (<). */
  readonly to?: Timestamp;
  readonly includeDeleted?: boolean;
  readonly limit?: number;
}

export function matchesQuery(entry: Entry, query: EntryQuery): boolean {
  if (!query.includeDeleted && entry.deletedAt !== null) return false;
  if (query.projectId !== undefined && entry.projectId !== query.projectId) return false;
  if (query.tag !== undefined && !entry.tags.includes(query.tag)) return false;
  if (query.from !== undefined && entry.createdAt < query.from) return false;
  if (query.to !== undefined && entry.createdAt >= query.to) return false;

  const needle = query.text?.trim().toLowerCase();
  if (needle) {
    const haystack = [entry.title, entry.body, entry.learned ?? "", ...entry.tags]
      .join("\n")
      .toLowerCase();
    if (!haystack.includes(needle)) return false;
  }
  return true;
}

/** Neueste zuerst; bei gleichem Zeitpunkt stabil nach ID. */
export function compareNewestFirst(a: Entry, b: Entry): number {
  return b.createdAt - a.createdAt || a.id.localeCompare(b.id);
}
