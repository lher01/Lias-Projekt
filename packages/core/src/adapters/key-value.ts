/**
 * Key-Value-Adapter: speichert Einträge und Projekte als JSON in einem
 * einfachen Schlüssel-Wert-Speicher, im Browser z. B. `localStorage`.
 *
 * Aufbau (Decorator-Muster): Gelesen und gesucht wird im In-Memory-
 * Repository, jede Änderung wird zusätzlich komplett weggeschrieben.
 * Für ein Tagebuch (wenige tausend Einträge) ist das schnell genug und
 * hält die Suchlogik an EINER Stelle.
 */
import type { Entry } from "../domain/entry";
import type { EntryQuery } from "../domain/entry-query";
import type { Project } from "../domain/project";
import type { EntryId, ProjectId, Timestamp } from "../domain/types";
import type { EntryRepository, ProjectRepository } from "../ports";
import { InMemoryEntryRepository, InMemoryProjectRepository } from "./in-memory";

/** Der Teil der Web-Storage-API, den wir brauchen. `localStorage` erfüllt ihn direkt. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** Version des gespeicherten Formats – für spätere Migrationen. */
const FORMAT_VERSION = 1;

interface Snapshot<T> {
  version: number;
  items: T[];
}

export class StorageReadError extends Error {
  constructor(key: string, reason: string) {
    super(`Gespeicherte Daten unter "${key}" konnten nicht gelesen werden: ${reason}`);
    this.name = "StorageReadError";
  }
}

/**
 * Liest einen Snapshot. Bei kaputten Daten wird bewusst ein Fehler geworfen,
 * statt leer zu starten: Sonst würde der nächste Speichervorgang die alten
 * (vielleicht noch rettbaren) Daten überschreiben.
 */
function readSnapshot<T>(store: KeyValueStore, key: string): T[] | null {
  const raw = store.getItem(key);
  if (raw === null) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new StorageReadError(key, "kein gültiges JSON");
  }
  const snapshot = parsed as Partial<Snapshot<T>>;
  if (snapshot.version !== FORMAT_VERSION || !Array.isArray(snapshot.items)) {
    throw new StorageReadError(key, `unbekanntes Format (Version ${String(snapshot.version)})`);
  }
  return snapshot.items;
}

function writeSnapshot<T>(store: KeyValueStore, key: string, items: T[]): void {
  const snapshot: Snapshot<T> = { version: FORMAT_VERSION, items };
  store.setItem(key, JSON.stringify(snapshot));
}

/** Alles seit Beginn der Zeit = alle Datensätze inklusive Tombstones. */
const EVERYTHING: Timestamp = Number.NEGATIVE_INFINITY;

export class KeyValueEntryRepository implements EntryRepository {
  private constructor(
    private readonly store: KeyValueStore,
    private readonly key: string,
    private readonly memory: InMemoryEntryRepository,
  ) {}

  static async open(store: KeyValueStore, key: string): Promise<KeyValueEntryRepository> {
    const memory = new InMemoryEntryRepository();
    for (const entry of readSnapshot<Entry>(store, key) ?? []) await memory.save(entry);
    return new KeyValueEntryRepository(store, key, memory);
  }

  get(id: EntryId): Promise<Entry | null> {
    return this.memory.get(id);
  }

  async save(entry: Entry): Promise<void> {
    const previous = await this.memory.get(entry.id);
    await this.memory.save(entry);
    try {
      writeSnapshot(this.store, this.key, await this.memory.changedSince(EVERYTHING));
    } catch (error) {
      // Speicher voll o. Ä.: Arbeitsspeicher zurückrollen, damit Anzeige und Speicher übereinstimmen.
      if (previous) await this.memory.save(previous);
      else await this.memory.remove(entry.id);
      throw error;
    }
  }

  find(query: EntryQuery): Promise<Entry[]> {
    return this.memory.find(query);
  }

  changedSince(since: Timestamp): Promise<Entry[]> {
    return this.memory.changedSince(since);
  }
}

export class KeyValueProjectRepository implements ProjectRepository {
  private constructor(
    private readonly store: KeyValueStore,
    private readonly key: string,
    private readonly memory: InMemoryProjectRepository,
  ) {}

  static async open(store: KeyValueStore, key: string): Promise<KeyValueProjectRepository> {
    const memory = new InMemoryProjectRepository();
    for (const project of readSnapshot<Project>(store, key) ?? []) await memory.save(project);
    return new KeyValueProjectRepository(store, key, memory);
  }

  get(id: ProjectId): Promise<Project | null> {
    return this.memory.get(id);
  }

  async save(project: Project): Promise<void> {
    const previous = await this.memory.get(project.id);
    await this.memory.save(project);
    try {
      writeSnapshot(this.store, this.key, await this.memory.changedSince(EVERYTHING));
    } catch (error) {
      if (previous) await this.memory.save(previous);
      else await this.memory.remove(project.id);
      throw error;
    }
  }

  list(options?: { includeDeleted?: boolean }): Promise<Project[]> {
    return this.memory.list(options);
  }

  changedSince(since: Timestamp): Promise<Project[]> {
    return this.memory.changedSince(since);
  }
}

/** Öffnet beide Repositories unter einem gemeinsamen Schlüssel-Präfix. */
export async function openKeyValueRepositories(store: KeyValueStore, prefix = "devlog") {
  return {
    entries: await KeyValueEntryRepository.open(store, `${prefix}:entries`),
    projects: await KeyValueProjectRepository.open(store, `${prefix}:projects`),
  };
}
