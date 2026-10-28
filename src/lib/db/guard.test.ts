import { describe, expect, it } from "vitest";
import { assertMainDatabase, assertSafeDatabaseUrls } from "./guard";

const main = "postgresql://u:p@localhost:5432/arbitrage?schema=public";
const shadow = "postgresql://u:p@localhost:5432/arbitrage_shadow?schema=public";

describe("database guards", () => {
  it("accepts the correct pair", () => expect(() => assertSafeDatabaseUrls(main, shadow)).not.toThrow());
  it("rejects another project's database", () =>
    expect(() => assertMainDatabase("postgresql://u:p@localhost:5432/other_project")).toThrow(/other_project/));
  it("rejects a wrong shadow database name", () =>
    expect(() => assertSafeDatabaseUrls(main, "postgresql://u:p@localhost:5432/other")).toThrow(/SHADOW/));
  it("rejects identical URLs", () => expect(() => assertSafeDatabaseUrls(main, main)).toThrow());
  it("rejects shadow pointing at main", () => expect(() => assertSafeDatabaseUrls(main, main)).toThrow());
  it("rejects missing URLs", () => expect(() => assertMainDatabase(undefined)).toThrow(/missing/));
});
