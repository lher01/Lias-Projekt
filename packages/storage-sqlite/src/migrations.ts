import type { SqlDriver } from "./driver";

/**
 * Schema-Migrationen: Jede Migration ist eine Liste einzelner Statements.
 * Die aktuelle Version steht in `PRAGMA user_version` direkt in der DB-Datei.
 *
 * Regel: Bestehende Migrationen NIE ändern, nur neue anhängen. Sonst haben
 * Nutzer mit alter Datenbank ein anderes Schema als neue Nutzer.
 */
export const MIGRATIONS: readonly (readonly string[])[] = [
  // 1: Grundschema
  [
    `CREATE TABLE projects (
       id          TEXT PRIMARY KEY,
       name        TEXT NOT NULL,
       created_at  INTEGER NOT NULL,
       updated_at  INTEGER NOT NULL,
       deleted_at  INTEGER
     )`,
    // Bewusst KEIN Foreign Key auf projects: Beim Sync kann ein Eintrag
    // vor seinem Projekt ankommen. Die Konsistenz prüft der DevlogService.
    `CREATE TABLE entries (
       id                TEXT PRIMARY KEY,
       project_id        TEXT,
       title             TEXT NOT NULL,
       body              TEXT NOT NULL DEFAULT '',
       learned           TEXT,
       tags              TEXT NOT NULL DEFAULT '[]',
       mood              TEXT,
       duration_minutes  INTEGER,
       created_at        INTEGER NOT NULL,
       updated_at        INTEGER NOT NULL,
       deleted_at        INTEGER
     )`,
    `CREATE INDEX idx_entries_created_at ON entries (created_at DESC)`,
    `CREATE INDEX idx_entries_updated_at ON entries (updated_at)`,
    `CREATE INDEX idx_entries_project_id ON entries (project_id)`,
    `CREATE INDEX idx_projects_updated_at ON projects (updated_at)`,
  ],
];

export async function migrate(db: SqlDriver): Promise<number> {
  const [row] = await db.select<{ user_version: number }>("PRAGMA user_version");
  const current = row?.user_version ?? 0;

  for (let version = current + 1; version <= MIGRATIONS.length; version++) {
    for (const statement of MIGRATIONS[version - 1] ?? []) {
      await db.execute(statement);
    }
    // PRAGMA erlaubt keine Platzhalter; `version` ist eine Zahl aus unserem Code.
    await db.execute(`PRAGMA user_version = ${version}`);
  }
  return MIGRATIONS.length;
}
