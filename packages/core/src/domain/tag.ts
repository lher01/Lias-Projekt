import { ValidationError } from "./errors";
import type { Brand } from "./types";

/** Ein normalisierter Tag: kleingeschrieben, ohne führendes "#". */
export type Tag = Brand<string, "Tag">;

const MAX_TAG_LENGTH = 40;
// Buchstaben/Ziffern am Anfang, danach auch - _ . + # erlaubt (für "c++", "c#", "node.js").
const TAG_PATTERN = /^[\p{L}\p{N}][\p{L}\p{N}\-_.+#]*$/u;

/**
 * "Parse, don't validate": Statt nur true/false zurückzugeben, liefert die
 * Funktion einen Wert vom Typ `Tag`. Wer einen `Tag` hat, weiß damit sicher,
 * dass er gültig ist.
 */
export function parseTag(raw: string): Tag {
  const value = raw.trim().replace(/^#/, "").toLowerCase();
  if (value.length === 0) {
    throw new ValidationError("Tag darf nicht leer sein", "tags");
  }
  if (value.length > MAX_TAG_LENGTH) {
    throw new ValidationError(`Tag darf höchstens ${MAX_TAG_LENGTH} Zeichen haben`, "tags");
  }
  if (!TAG_PATTERN.test(value)) {
    throw new ValidationError(`Ungültiger Tag "${raw}"`, "tags");
  }
  return value as Tag;
}

/** Parst mehrere Tags und entfernt Duplikate (Reihenfolge bleibt erhalten). */
export function parseTags(raw: readonly string[]): Tag[] {
  return [...new Set(raw.map(parseTag))];
}
