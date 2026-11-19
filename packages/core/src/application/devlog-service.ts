/**
 * APPLICATION-SCHICHT = die Anwendungsfälle ("Use Cases").
 *
 * Sie orchestriert: lädt Daten über Ports, ruft reine Domain-Funktionen auf
 * und speichert das Ergebnis. Die eigentlichen Regeln (was ist ein gültiger
 * Titel?) stehen in der Domain, nicht hier.
 */
import { applyPatch, createEntry, type Entry, type EntryDraft, type EntryPatch } from "../domain/entry";
import type { EntryQuery } from "../domain/entry-query";
import { NotFoundError, ValidationError } from "../domain/errors";
import { createProject, renameProject, type Project } from "../domain/project";
import { parseTag } from "../domain/tag";
import { tombstone, type EntryId, type ProjectId, type Timestamp } from "../domain/types";
import type { Clock, EntryRepository, IdGenerator, ProjectRepository } from "../ports";

export interface DevlogDeps {
  readonly entries: EntryRepository;
  readonly projects: ProjectRepository;
  readonly clock: Clock;
  readonly ids: IdGenerator;
}

/** Filter, wie ihn die UI liefert: Tag noch als roher String. */
export interface EntryFilter extends Omit<EntryQuery, "tag" | "includeDeleted"> {
  readonly tag?: string;
}

export class DevlogService {
  constructor(private readonly deps: DevlogDeps) {}

  // ---------- Einträge ----------

  async createEntry(draft: EntryDraft): Promise<Entry> {
    if (draft.projectId) await this.requireProject(draft.projectId);
    const entry = createEntry(this.deps.ids.next() as EntryId, draft, this.now());
    await this.deps.entries.save(entry);
    return entry;
  }

  async updateEntry(id: EntryId, patch: EntryPatch): Promise<Entry> {
    const current = await this.getEntry(id);
    if (patch.projectId) await this.requireProject(patch.projectId);
    const updated = applyPatch(current, patch, this.now());
    await this.deps.entries.save(updated);
    return updated;
  }

  async deleteEntry(id: EntryId): Promise<void> {
    const current = await this.getEntry(id);
    await this.deps.entries.save(tombstone(current, this.now()));
  }

  async getEntry(id: EntryId): Promise<Entry> {
    const entry = await this.deps.entries.get(id);
    if (!entry || entry.deletedAt !== null) throw new NotFoundError("Eintrag", id);
    return entry;
  }

  async listEntries(filter: EntryFilter = {}): Promise<Entry[]> {
    const { tag, ...rest } = filter;
    return this.deps.entries.find({
      ...rest,
      ...(tag !== undefined && { tag: parseTag(tag) }),
    });
  }

  // ---------- Projekte ----------

  async createProject(name: string): Promise<Project> {
    await this.ensureUniqueProjectName(name);
    const project = createProject(this.deps.ids.next() as ProjectId, name, this.now());
    await this.deps.projects.save(project);
    return project;
  }

  async renameProject(id: ProjectId, name: string): Promise<Project> {
    const current = await this.requireProject(id);
    await this.ensureUniqueProjectName(name, id);
    const updated = renameProject(current, name, this.now());
    await this.deps.projects.save(updated);
    return updated;
  }

  /**
   * Löscht nur das Projekt. Einträge behalten ihre projectId, damit beim Sync
   * nichts "verwaist" überschrieben wird; die UI kann sie als
   * "gelöschtes Projekt" anzeigen.
   */
  async deleteProject(id: ProjectId): Promise<void> {
    const current = await this.requireProject(id);
    await this.deps.projects.save(tombstone(current, this.now()));
  }

  async listProjects(): Promise<Project[]> {
    return this.deps.projects.list();
  }

  // ---------- Hilfsfunktionen ----------

  private now(): Timestamp {
    return this.deps.clock.now();
  }

  private async requireProject(id: ProjectId): Promise<Project> {
    const project = await this.deps.projects.get(id);
    if (!project || project.deletedAt !== null) throw new NotFoundError("Projekt", id);
    return project;
  }

  private async ensureUniqueProjectName(name: string, exceptId?: ProjectId): Promise<void> {
    const wanted = name.trim().toLowerCase();
    const projects = await this.deps.projects.list();
    if (projects.some((p) => p.id !== exceptId && p.name.toLowerCase() === wanted)) {
      throw new ValidationError(`Ein Projekt "${name.trim()}" gibt es schon`, "name");
    }
  }
}
