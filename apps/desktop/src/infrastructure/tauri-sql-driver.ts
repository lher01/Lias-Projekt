import Database from "@tauri-apps/plugin-sql";
import type { SqlDriver, SqlValue } from "@devlog/storage-sqlite";

/**
 * Adapter: @tauri-apps/plugin-sql → SqlDriver.
 * Die Datei landet im App-Datenordner des Nutzers, unter Windows z. B.
 * %APPDATA%\dev.devlog.desktop\devlog.db
 */
export async function openTauriSqlDriver(path = "sqlite:devlog.db"): Promise<SqlDriver> {
  const db = await Database.load(path);
  return {
    async execute(sql: string, params: readonly SqlValue[] = []) {
      await db.execute(sql, [...params]);
    },
    async select<Row>(sql: string, params: readonly SqlValue[] = []) {
      return db.select<Row[]>(sql, [...params]);
    },
  };
}
