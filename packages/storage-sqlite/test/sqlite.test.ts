import { describeRepositoryContract } from "@devlog/core/testing";
import { describe, expect, it } from "vitest";
import { MIGRATIONS, migrate, openSqliteRepositories } from "../src";
import { createNodeSqliteDriver } from "./node-sqlite-driver";

// Dieselben Verhaltens-Tests wie für den In-Memory-Adapter:
describeRepositoryContract("SQLite", async () => openSqliteRepositories(createNodeSqliteDriver()));

describe("Migrationen", () => {
  it("setzt user_version auf die neueste Version", async () => {
    const db = createNodeSqliteDriver();
    await migrate(db);
    const [row] = await db.select<{ user_version: number }>("PRAGMA user_version");
    expect(row?.user_version).toBe(MIGRATIONS.length);
  });

  it("ist idempotent: ein zweiter Lauf ändert nichts und wirft nicht", async () => {
    const db = createNodeSqliteDriver();
    await migrate(db);
    await expect(migrate(db)).resolves.toBe(MIGRATIONS.length);
  });
});
