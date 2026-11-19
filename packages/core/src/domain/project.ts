import { ValidationError } from "./errors";
import type { ProjectId, SyncMetadata, Timestamp } from "./types";

export interface Project extends SyncMetadata {
  readonly id: ProjectId;
  readonly name: string;
}

const MAX_NAME_LENGTH = 80;

function parseName(raw: string): string {
  const name = raw.trim();
  if (name.length === 0) throw new ValidationError("Projektname darf nicht leer sein", "name");
  if (name.length > MAX_NAME_LENGTH) {
    throw new ValidationError(`Projektname darf höchstens ${MAX_NAME_LENGTH} Zeichen haben`, "name");
  }
  return name;
}

export function createProject(id: ProjectId, name: string, now: Timestamp): Project {
  return { id, name: parseName(name), createdAt: now, updatedAt: now, deletedAt: null };
}

export function renameProject(project: Project, name: string, now: Timestamp): Project {
  return { ...project, name: parseName(name), updatedAt: now };
}
