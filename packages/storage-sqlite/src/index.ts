import type { SqlDriver } from "./driver";
import { migrate } from "./migrations";
import { SqliteEntryRepository, SqliteProjectRepository } from "./repositories";

export type { SqlDriver, SqlValue } from "./driver";
export { MIGRATIONS, migrate } from "./migrations";
export { SqliteEntryRepository, SqliteProjectRepository } from "./repositories";

/** Bringt das Schema auf den neuesten Stand und liefert die fertigen Repositories. */
export async function openSqliteRepositories(db: SqlDriver) {
  await migrate(db);
  return {
    entries: new SqliteEntryRepository(db),
    projects: new SqliteProjectRepository(db),
  };
}
