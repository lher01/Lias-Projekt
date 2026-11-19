/** Echte Implementierungen für den Produktivbetrieb (Browser/Tauri-WebView und Node). */
import type { Clock, IdGenerator } from "../ports";

export const systemClock: Clock = {
  now: () => Date.now(),
};

export const uuidGenerator: IdGenerator = {
  next: () => crypto.randomUUID(),
};
