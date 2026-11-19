/**
 * PORTS = die "Steckdosen" des Cores.
 *
 * Der Core definiert hier nur, *was* er von der Außenwelt braucht.
 * *Wie* das umgesetzt wird (SQLite, IndexedDB, In-Memory, ...) entscheiden
 * die Adapter. Die Abhängigkeit zeigt also immer von außen nach innen:
 *
 *   Adapter (SQLite) ──implementiert──▶ Port (EntryRepository) ◀──nutzt── Core
 */
import type { Entry } from "../domain/entry";
import type { EntryQuery } from "../domain/entry-query";
import type { Project } from "../domain/project";
import type { EntryId, ProjectId, Timestamp } from "../domain/types";

export interface EntryRepository {
  /** Liefert auch gelöschte Einträge (Tombstones), damit der Sync sie sieht. */
  get(id: EntryId): Promise<Entry | null>;
  /** Insert oder Update ("Upsert"). */
  save(entry: Entry): Promise<void>;
  /** Treffer sortiert nach "neueste zuerst". */
  find(query: EntryQuery): Promise<Entry[]>;
  /** Alles mit `updatedAt > since`, inkl. Tombstones. Grundlage für den Sync. */
  changedSince(since: Timestamp): Promise<Entry[]>;
}

export interface ProjectRepository {
  get(id: ProjectId): Promise<Project | null>;
  save(project: Project): Promise<void>;
  list(options?: { includeDeleted?: boolean }): Promise<Project[]>;
  changedSince(since: Timestamp): Promise<Project[]>;
}

/** Zeit als Abhängigkeit: Tests können so eine feste Uhr einsetzen. */
export interface Clock {
  now(): Timestamp;
}

/** IDs als Abhängigkeit: Tests bekommen vorhersagbare IDs. */
export interface IdGenerator {
  next(): string;
}
