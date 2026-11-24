/**
 * In-Memory-Adapter: Daten liegen nur im Arbeitsspeicher.
 * Ideal für Tests und zum Prototypen der UI, bevor SQLite angebunden ist.
 * Der SQLite-Adapter wird später exakt dieselben Interfaces implementieren.
 */
import type { Entry } from "../domain/entry";
import { compareNewestFirst, matchesQuery, type EntryQuery } from "../domain/entry-query";
import type { Project } from "../domain/project";
import type { EntryId, ProjectId, Timestamp } from "../domain/types";
import type { EntryRepository, ProjectRepository } from "../ports";

export class InMemoryEntryRepository implements EntryRepository {
  private readonly items = new Map<EntryId, Entry>();

  async get(id: EntryId): Promise<Entry | null> {
    return this.items.get(id) ?? null;
  }

  async save(entry: Entry): Promise<void> {
    this.items.set(entry.id, entry);
  }

  async find(query: EntryQuery): Promise<Entry[]> {
    const result = [...this.items.values()]
      .filter((e) => matchesQuery(e, query))
      .sort(compareNewestFirst);
    return query.limit !== undefined ? result.slice(0, query.limit) : result;
  }

  async changedSince(since: Timestamp): Promise<Entry[]> {
    return [...this.items.values()].filter((e) => e.updatedAt > since);
  }

  /** Nur für Adapter, die Änderungen zurückrollen müssen – fachlich wird nie hart gelöscht. */
  async remove(id: EntryId): Promise<void> {
    this.items.delete(id);
  }
}

export class InMemoryProjectRepository implements ProjectRepository {
  private readonly items = new Map<ProjectId, Project>();

  async get(id: ProjectId): Promise<Project | null> {
    return this.items.get(id) ?? null;
  }

  async save(project: Project): Promise<void> {
    this.items.set(project.id, project);
  }

  async list(options: { includeDeleted?: boolean } = {}): Promise<Project[]> {
    return [...this.items.values()]
      .filter((p) => options.includeDeleted || p.deletedAt === null)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async changedSince(since: Timestamp): Promise<Project[]> {
    return [...this.items.values()].filter((p) => p.updatedAt > since);
  }

  /** Nur für Adapter, die Änderungen zurückrollen müssen – fachlich wird nie hart gelöscht. */
  async remove(id: ProjectId): Promise<void> {
    this.items.delete(id);
  }
}
