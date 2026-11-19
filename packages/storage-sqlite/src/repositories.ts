import type {
  Entry,
  EntryId,
  EntryQuery,
  EntryRepository,
  Mood,
  Project,
  ProjectId,
  ProjectRepository,
  Tag,
  Timestamp,
} from "@devlog/core";
import type { SqlDriver, SqlValue } from "./driver";

// ---------- Zeilen <-> Domain-Objekte ----------
// Die DB nutzt snake_case und speichert Tags als JSON-Text.
// Diese "Mapper" sind die einzige Stelle, die beide Welten kennt.

interface EntryRow {
  id: string;
  project_id: string | null;
  title: string;
  body: string;
  learned: string | null;
  tags: string;
  mood: string | null;
  duration_minutes: number | null;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
}

interface ProjectRow {
  id: string;
  name: string;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
}

function toEntry(row: EntryRow): Entry {
  return {
    id: row.id as EntryId,
    projectId: row.project_id as ProjectId | null,
    title: row.title,
    body: row.body,
    learned: row.learned,
    tags: JSON.parse(row.tags) as Tag[],
    mood: row.mood as Mood | null,
    durationMinutes: row.duration_minutes,
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
    deletedAt: row.deleted_at === null ? null : Number(row.deleted_at),
  };
}

function toProject(row: ProjectRow): Project {
  return {
    id: row.id as ProjectId,
    name: row.name,
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
    deletedAt: row.deleted_at === null ? null : Number(row.deleted_at),
  };
}

/** Maskiert % und _ für LIKE, damit eine Suche nach "100%" wörtlich gemeint ist. */
function likePattern(text: string): string {
  return `%${text.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

// ---------- Repositories ----------

export class SqliteEntryRepository implements EntryRepository {
  constructor(private readonly db: SqlDriver) {}

  async get(id: EntryId): Promise<Entry | null> {
    const [row] = await this.db.select<EntryRow>("SELECT * FROM entries WHERE id = ?", [id]);
    return row ? toEntry(row) : null;
  }

  async save(e: Entry): Promise<void> {
    await this.db.execute(
      `INSERT INTO entries
         (id, project_id, title, body, learned, tags, mood, duration_minutes, created_at, updated_at, deleted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (id) DO UPDATE SET
         project_id = excluded.project_id,
         title = excluded.title,
         body = excluded.body,
         learned = excluded.learned,
         tags = excluded.tags,
         mood = excluded.mood,
         duration_minutes = excluded.duration_minutes,
         created_at = excluded.created_at,
         updated_at = excluded.updated_at,
         deleted_at = excluded.deleted_at`,
      [
        e.id,
        e.projectId,
        e.title,
        e.body,
        e.learned,
        JSON.stringify(e.tags),
        e.mood,
        e.durationMinutes,
        e.createdAt,
        e.updatedAt,
        e.deletedAt,
      ],
    );
  }

  /** Übersetzt die fachliche EntryQuery in SQL. Werte gehen immer als Parameter rein, nie als Text. */
  async find(query: EntryQuery): Promise<Entry[]> {
    const where: string[] = [];
    const params: SqlValue[] = [];

    if (!query.includeDeleted) where.push("deleted_at IS NULL");
    if (query.projectId !== undefined) {
      where.push("project_id = ?");
      params.push(query.projectId);
    }
    if (query.tag !== undefined) {
      where.push("EXISTS (SELECT 1 FROM json_each(entries.tags) WHERE json_each.value = ?)");
      params.push(query.tag);
    }
    if (query.from !== undefined) {
      where.push("created_at >= ?");
      params.push(query.from);
    }
    if (query.to !== undefined) {
      where.push("created_at < ?");
      params.push(query.to);
    }
    const text = query.text?.trim().toLowerCase();
    if (text) {
      // Hinweis: lower() und LIKE kennen in SQLite nur ASCII. "Ä" vs. "ä" wird
      // daher noch unterschieden. Später: FTS5-Volltextindex (siehe README).
      const columns = ["title", "body", "COALESCE(learned, '')", "tags"];
      where.push(`(${columns.map((c) => `lower(${c}) LIKE ? ESCAPE '\\'`).join(" OR ")})`);
      params.push(...columns.map(() => likePattern(text)));
    }

    let sql = "SELECT * FROM entries";
    if (where.length > 0) sql += ` WHERE ${where.join(" AND ")}`;
    sql += " ORDER BY created_at DESC, id ASC";
    if (query.limit !== undefined) {
      sql += " LIMIT ?";
      params.push(query.limit);
    }

    const rows = await this.db.select<EntryRow>(sql, params);
    return rows.map(toEntry);
  }

  async changedSince(since: Timestamp): Promise<Entry[]> {
    const rows = await this.db.select<EntryRow>("SELECT * FROM entries WHERE updated_at > ?", [since]);
    return rows.map(toEntry);
  }
}

export class SqliteProjectRepository implements ProjectRepository {
  constructor(private readonly db: SqlDriver) {}

  async get(id: ProjectId): Promise<Project | null> {
    const [row] = await this.db.select<ProjectRow>("SELECT * FROM projects WHERE id = ?", [id]);
    return row ? toProject(row) : null;
  }

  async save(p: Project): Promise<void> {
    await this.db.execute(
      `INSERT INTO projects (id, name, created_at, updated_at, deleted_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (id) DO UPDATE SET
         name = excluded.name,
         created_at = excluded.created_at,
         updated_at = excluded.updated_at,
         deleted_at = excluded.deleted_at`,
      [p.id, p.name, p.createdAt, p.updatedAt, p.deletedAt],
    );
  }

  async list(options: { includeDeleted?: boolean } = {}): Promise<Project[]> {
    const where = options.includeDeleted ? "" : " WHERE deleted_at IS NULL";
    const rows = await this.db.select<ProjectRow>(`SELECT * FROM projects${where} ORDER BY name COLLATE NOCASE`);
    return rows.map(toProject);
  }

  async changedSince(since: Timestamp): Promise<Project[]> {
    const rows = await this.db.select<ProjectRow>("SELECT * FROM projects WHERE updated_at > ?", [since]);
    return rows.map(toProject);
  }
}
