import { ValidationError } from "./errors";
import { parseTags, type Tag } from "./tag";
import type { EntryId, ProjectId, SyncMetadata, Timestamp } from "./types";

export const MOODS = ["great", "ok", "frustrated"] as const;
export type Mood = (typeof MOODS)[number];

/**
 * Ein Tagebucheintrag. Alle Felder sind `readonly`: Änderungen erzeugen
 * immer ein neues Objekt. Das macht den Code vorhersehbar und passt gut
 * zu React und zum späteren Sync (alter und neuer Stand lassen sich vergleichen).
 */
export interface Entry extends SyncMetadata {
  readonly id: EntryId;
  readonly projectId: ProjectId | null;
  readonly title: string;
  /** Freitext in Markdown, inklusive Code-Blöcken. */
  readonly body: string;
  /** "Heute gelernt"-Notiz. */
  readonly learned: string | null;
  readonly tags: readonly Tag[];
  readonly mood: Mood | null;
  readonly durationMinutes: number | null;
}

/** Eingabe von außen (z. B. aus einem Formular), noch nicht validiert. */
export interface EntryDraft {
  title: string;
  body?: string;
  learned?: string | null;
  tags?: readonly string[];
  mood?: Mood | null;
  durationMinutes?: number | null;
  projectId?: ProjectId | null;
}

export type EntryPatch = Partial<EntryDraft>;

const MAX_TITLE_LENGTH = 200;
const MAX_DURATION_MINUTES = 24 * 60;

function parseTitle(raw: string): string {
  const title = raw.trim();
  if (title.length === 0) throw new ValidationError("Titel darf nicht leer sein", "title");
  if (title.length > MAX_TITLE_LENGTH) {
    throw new ValidationError(`Titel darf höchstens ${MAX_TITLE_LENGTH} Zeichen haben`, "title");
  }
  return title;
}

function parseMood(raw: Mood | null): Mood | null {
  if (raw === null) return null;
  if (!MOODS.includes(raw)) throw new ValidationError(`Unbekannte Stimmung "${raw}"`, "mood");
  return raw;
}

function parseDuration(raw: number | null): number | null {
  if (raw === null) return null;
  if (!Number.isInteger(raw) || raw < 0 || raw > MAX_DURATION_MINUTES) {
    throw new ValidationError(
      `Dauer muss eine ganze Zahl zwischen 0 und ${MAX_DURATION_MINUTES} Minuten sein`,
      "durationMinutes",
    );
  }
  return raw;
}

function parseLearned(raw: string | null): string | null {
  if (raw === null) return null;
  const text = raw.trim();
  return text.length === 0 ? null : text;
}

export function createEntry(id: EntryId, draft: EntryDraft, now: Timestamp): Entry {
  return {
    id,
    projectId: draft.projectId ?? null,
    title: parseTitle(draft.title),
    body: draft.body ?? "",
    learned: parseLearned(draft.learned ?? null),
    tags: parseTags(draft.tags ?? []),
    mood: parseMood(draft.mood ?? null),
    durationMinutes: parseDuration(draft.durationMinutes ?? null),
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
}

/** Wendet nur die Felder an, die im Patch gesetzt sind. */
export function applyPatch(entry: Entry, patch: EntryPatch, now: Timestamp): Entry {
  return {
    ...entry,
    ...(patch.title !== undefined && { title: parseTitle(patch.title) }),
    ...(patch.body !== undefined && { body: patch.body }),
    ...(patch.learned !== undefined && { learned: parseLearned(patch.learned) }),
    ...(patch.tags !== undefined && { tags: parseTags(patch.tags) }),
    ...(patch.mood !== undefined && { mood: parseMood(patch.mood) }),
    ...(patch.durationMinutes !== undefined && {
      durationMinutes: parseDuration(patch.durationMinutes),
    }),
    ...(patch.projectId !== undefined && { projectId: patch.projectId }),
    updatedAt: now,
  };
}
