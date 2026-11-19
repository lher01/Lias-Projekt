/**
 * "Branded Types": Zur Laufzeit sind das ganz normale Strings, aber der
 * Compiler unterscheidet sie. So kann man nicht aus Versehen eine ProjectId
 * übergeben, wo eine EntryId erwartet wird.
 */
declare const brand: unique symbol;
export type Brand<T, B extends string> = T & { readonly [brand]: B };

export type EntryId = Brand<string, "EntryId">;
export type ProjectId = Brand<string, "ProjectId">;

/**
 * Millisekunden seit 1970 (UTC). Zahlen statt Date-Objekten, weil sie sich
 * trivial vergleichen, serialisieren und später synchronisieren lassen.
 */
export type Timestamp = number;

/**
 * Felder, die jede synchronisierbare Entität hat.
 *
 * - `updatedAt` erlaubt dem Sync später: "Gib mir alles, was sich seit X geändert hat".
 * - `deletedAt` ist ein "Tombstone": Gelöschtes wird nur markiert, nicht entfernt.
 *   Sonst könnte ein anderes Gerät nie erfahren, dass etwas gelöscht wurde.
 */
export interface SyncMetadata {
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
  readonly deletedAt: Timestamp | null;
}

export function tombstone<T extends SyncMetadata>(item: T, now: Timestamp): T {
  if (item.deletedAt !== null) return item;
  return { ...item, updatedAt: now, deletedAt: now };
}
