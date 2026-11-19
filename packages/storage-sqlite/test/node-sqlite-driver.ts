import { DatabaseSync } from "node:sqlite";
import type { SqlDriver, SqlValue } from "../src";

/**
 * SqlDriver auf Basis des in Node eingebauten SQLite, nur für Tests.
 * In der App übernimmt das @tauri-apps/plugin-sql (siehe apps/desktop).
 */
export function createNodeSqliteDriver(path = ":memory:"): SqlDriver {
  const db = new DatabaseSync(path);
  return {
    async execute(sql: string, params: readonly SqlValue[] = []) {
      db.prepare(sql).run(...params);
    },
    async select<Row>(sql: string, params: readonly SqlValue[] = []) {
      return db.prepare(sql).all(...params) as Row[];
    },
  };
}
