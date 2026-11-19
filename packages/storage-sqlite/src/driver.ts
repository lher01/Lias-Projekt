/**
 * Minimale Abstraktion über einen SQLite-Treiber.
 *
 * Warum noch eine Schicht? Es gibt mehrere Treiber:
 *   - Tauri:  @tauri-apps/plugin-sql (asynchron, läuft über Rust/sqlx)
 *   - Tests:  node:sqlite (synchron, in Node eingebaut)
 *   - später vielleicht Handy-spezifische Treiber
 * Die Repositories sprechen nur mit diesem Interface und müssen den
 * Treiber nicht kennen. Platzhalter sind immer `?` (positionell).
 */
export type SqlValue = string | number | null;

export interface SqlDriver {
  execute(sql: string, params?: readonly SqlValue[]): Promise<void>;
  select<Row>(sql: string, params?: readonly SqlValue[]): Promise<Row[]>;
}
