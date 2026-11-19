import { describe, expect, it } from "vitest";
import { applyPatch, createEntry, parseTag, parseTags, ValidationError, type EntryId } from "../src";

const id = "e1" as EntryId;

describe("parseTag", () => {
  it("normalisiert Groß/Kleinschreibung, Leerzeichen und führendes #", () => {
    expect(parseTag("  #TypeScript ")).toBe("typescript");
  });

  it("erlaubt typische Technik-Namen", () => {
    expect(parseTags(["c++", "#c#", "node.js", "bug-fix"])).toEqual(["c++", "c#", "node.js", "bug-fix"]);
  });

  it("entfernt Duplikate", () => {
    expect(parseTags(["React", "#react", "REACT"])).toEqual(["react"]);
  });

  it.each(["", "   ", "#", "mit leerzeichen", "-start"])("lehnt %j ab", (raw) => {
    expect(() => parseTag(raw)).toThrow(ValidationError);
  });
});

describe("createEntry", () => {
  it("setzt Standardwerte und Zeitstempel", () => {
    const entry = createEntry(id, { title: "  Erster Eintrag " }, 1000);
    expect(entry).toEqual({
      id,
      projectId: null,
      title: "Erster Eintrag",
      body: "",
      learned: null,
      tags: [],
      mood: null,
      durationMinutes: null,
      createdAt: 1000,
      updatedAt: 1000,
      deletedAt: null,
    });
  });

  it("lehnt leere Titel ab", () => {
    expect(() => createEntry(id, { title: "   " }, 0)).toThrow(ValidationError);
  });

  it.each([-1, 1.5, 24 * 60 + 1])("lehnt Dauer %d ab", (durationMinutes) => {
    expect(() => createEntry(id, { title: "x", durationMinutes }, 0)).toThrow(ValidationError);
  });

  it("speichert leere 'Gelernt'-Notiz als null", () => {
    expect(createEntry(id, { title: "x", learned: "   " }, 0).learned).toBeNull();
  });
});

describe("applyPatch", () => {
  it("ändert nur gesetzte Felder und aktualisiert updatedAt", () => {
    const original = createEntry(id, { title: "Alt", body: "Text", tags: ["a"] }, 1000);
    const patched = applyPatch(original, { title: "Neu" }, 2000);

    expect(patched.title).toBe("Neu");
    expect(patched.body).toBe("Text");
    expect(patched.tags).toEqual(["a"]);
    expect(patched.createdAt).toBe(1000);
    expect(patched.updatedAt).toBe(2000);
  });

  it("verändert das Original nicht (Immutability)", () => {
    const original = createEntry(id, { title: "Alt" }, 1000);
    applyPatch(original, { title: "Neu" }, 2000);
    expect(original.title).toBe("Alt");
  });

  it("kann optionale Felder mit null wieder leeren", () => {
    const original = createEntry(id, { title: "x", mood: "great" }, 0);
    expect(applyPatch(original, { mood: null }, 1).mood).toBeNull();
  });
});
