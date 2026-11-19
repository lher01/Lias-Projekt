# DevLog – ein Tagebuch für Programmierer

Halte fest, woran du gearbeitet hast, was du gelernt hast und wie es lief.
**Local-First:** Deine Daten liegen auf deinem Gerät. Zwischen PC und Handy werden sie
über ein Email-Konto synchronisiert, **Ende-zu-Ende-verschlüsselt**.

## Schnellstart

```powershell
npm install
npm test           # alle Tests
npm run typecheck  # TypeScript prüfen
```

### Desktop-App starten

**Im Browser (ohne Rust, Demo-Daten im Speicher)**: ideal, um an der Oberfläche zu arbeiten:

```powershell
npm run dev -w @devlog/desktop
```

Dann http://localhost:1420 öffnen.

**Als echte Desktop-App (Tauri, Daten in SQLite)**: braucht einmalig die Rust-Toolchain
von https://rustup.rs (inklusive „Visual Studio C++ Build Tools“):

```powershell
npm run tauri dev -w @devlog/desktop
```

Der erste Start kompiliert die Rust-Abhängigkeiten und dauert einige Minuten. Die Datenbank liegt danach unter
`%APPDATA%\dev.devlog.desktop\devlog.db`.

## Fahrplan

| Phase | Inhalt | Status |
|---|---|---|
| 1a | `@devlog/core`: Domain, Ports, Use Cases, Tests | ✅ |
| 1b | `@devlog/storage-sqlite` + `apps/desktop`: Tauri + React | ✅ (Tauri-Start mit Rust noch zu prüfen) |
| 1c | Markdown-Vorschau, Volltextsuche (FTS5), Statistik-Kalender | ⏳ als Nächstes |
| 2 | `apps/sync-server` + `@devlog/sync`: Email-Login (Magic Link), verschlüsselter Abgleich | |
| 3 | `apps/mobile`: Tauri Mobile, nutzt `core` und `sync` wieder | |
| 4 | Extras: Git-Commits importieren, Statistiken, Serien | |

## Architektur

### Zielbild (Monorepo)

```
devlog/
├── packages/
│   ├── core/            Fachlogik, reines TypeScript            ✅
│   ├── storage-sqlite/  SQLite-Adapter (treiberunabhängig)      ✅
│   ├── sync/            Sync-Protokoll, Konflikte, Verschlüsselung
│   └── ui/              Gemeinsame React-Komponenten
└── apps/
    ├── desktop/         Tauri + React                           ✅
    ├── mobile/          Tauri Mobile
    └── sync-server/   Node: Login + Speicher für verschlüsselte Daten
```

### Hexagonale Architektur (Ports & Adapters)

```
          ┌──────────────── Adapter (außen) ────────────────┐
          │  React-UI    SQLite    IndexedDB    In-Memory   │
          └──────┬──────────┬──────────┬───────────┬────────┘
                 │ nutzt    │ implementieren Ports │
          ┌──────▼──────────▼──────────▼───────────▼────────┐
          │  application/   DevlogService (Use Cases)       │
          │  ports/         EntryRepository, Clock, ...     │
          │  ┌───────────────────────────────────────────┐  │
          │  │ domain/  Entry, Project, Tag, Regeln      │  │
          │  │          reine Funktionen, keine I/O      │  │
          │  └───────────────────────────────────────────┘  │
          └─────────────────────────────────────────────────┘
```

**Die eine Regel:** Abhängigkeiten zeigen nur nach innen. `domain/` importiert nichts
von außen. `application/` kennt nur Interfaces (`ports/`), keine Datenbank.
Darum laufen alle Tests ohne Datenbank in Millisekunden, und derselbe Core funktioniert
auf Desktop, Handy und (für Prüfungen) auf dem Server.

### Bewusste Entscheidungen im Core

| Entscheidung | Warum |
|---|---|
| **Branded Types** (`EntryId`, `ProjectId`, `Tag`) | Der Compiler verhindert Verwechslungen, obwohl alles Strings sind. |
| **Parse, don't validate** (`parseTag`, `createEntry`) | Ungültige Daten kommen gar nicht erst in die Domain. Wer einen `Tag` hat, hat einen gültigen. |
| **Immutable Entities** + reine Funktionen | Vorhersehbar, leicht testbar, passt zu React und zum Sync (Vorher/Nachher vergleichbar). |
| **`Clock` und `IdGenerator` als Ports** | Tests sind deterministisch: Uhrzeit und IDs werden kontrolliert. |
| **UUIDs** statt hochzählender IDs | Zwei Geräte können offline Einträge anlegen, ohne dass IDs kollidieren. |
| **Soft Delete** (`deletedAt`, „Tombstone“) | Sonst erfährt das andere Gerät nie von einer Löschung. |
| **`updatedAt` + `changedSince()`** | Grundlage für den Delta-Sync: „Schick mir alles seit meinem letzten Abgleich.“ |
| **`EntryQuery` als Objekt** | Beschreibt *was* gesucht wird. SQLite kann es in SQL mit Volltextsuche übersetzen. |

### Adapter austauschbar machen: Contract-Tests

`@devlog/core/testing` enthält eine Testsuite, die **jede** Repository-Implementierung
bestehen muss. In-Memory (`packages/core/test`) und SQLite (`packages/storage-sqlite/test`)
rufen dieselbe Suite auf. Ein Interface legt nur Signaturen fest, der Contract legt das *Verhalten* fest.

### Speicher-Schicht (`@devlog/storage-sqlite`)

```
SqliteEntryRepository ──▶ SqlDriver (Interface) ◀── Tauri-Plugin-SQL   (App)
                                                ◀── node:sqlite        (Tests)
```

- **Migrationen** stehen in TypeScript, die Version in `PRAGMA user_version`. Regel: Bestehende Migrationen nie ändern, nur neue anhängen.
- **Kein Foreign Key** von `entries.project_id` auf `projects`: Beim Sync kann ein Eintrag vor seinem Projekt ankommen.
- **Tags als JSON-Spalte**: Die Tag-Suche nutzt `json_each()`. Eine eigene Tabelle lohnt sich erst, wenn Tags umbenannt werden sollen.

### Composition Root (`apps/desktop/src/infrastructure/services.ts`)

Die einzige Stelle, die konkrete Adapter auswählt: SQLite in Tauri, In-Memory mit Demo-Daten im Browser.
Die React-Komponenten kennen nur den `DevlogService`.

### Offene Architektur-Themen (für später)

- **Volltextsuche:** `LIKE` und `lower()` kennen in SQLite nur ASCII. Deshalb ist die Suche bei „Ä“ und „ä“
  noch nicht einheitlich. Lösung: FTS5-Index mit `unicode61`-Tokenizer.
- **Content Security Policy:** steht in `tauri.conf.json` vorerst auf `null` und wird gehärtet, bevor die App verteilt wird.

- **Konflikte:** Zunächst *Last-Write-Wins* pro Eintrag anhand von `updatedAt`.
  Problem: Die Uhren der Geräte können abweichen. Lösung: *Hybrid Logical Clocks* (Phase 2).
- **Atomare Schreibvorgänge:** Sobald mehrere Speicheroperationen zusammengehören,
  kommt ein *Unit of Work* bzw. eine Transaktion im SQLite-Adapter dazu.
- **Verschlüsselung:** Schlüssel wird aus einer Passphrase abgeleitet und verlässt das Gerät nie.
  Der Server speichert nur verschlüsselte Blöcke (Web Crypto API, AES-GCM).

## Projektstruktur `packages/core`

```
src/
├── domain/        Entitäten und Regeln (keine I/O)
├── ports/         Interfaces nach außen
├── application/   DevlogService: Use Cases
├── adapters/      In-Memory (Tests/Prototyp), System-Uhr, UUIDs
└── index.ts       Öffentliche API
test/              Vitest
```
