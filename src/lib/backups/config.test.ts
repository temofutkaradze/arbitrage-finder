import { describe, expect, it } from "vitest";
import { backupArguments, localBackupConnection, toolEnvironment } from "./config";
describe("local backup constraints", () => {
  it("requires the local main database and rejects redirects and unexpected libpq options", () => {
    for (const input of [undefined, "not a URL", "postgresql://user@evil.example/arbitrage", "postgresql://user@127.0.0.1/other", "https://user@127.0.0.1/arbitrage", "postgresql://user@127.0.0.1/arbitrage?host=evil.example", "postgresql://user@127.0.0.1/arbitrage?options=-canything", "postgresql://user@127.0.0.1/arbitrage#ignored", "postgresql://127.0.0.1/arbitrage", "postgresql://user:%00@127.0.0.1/arbitrage"]) expect(() => localBackupConnection(input)).toThrow("Backup requires a local PostgreSQL");
    const parsed = localBackupConnection("postgresql://test:p%40ss%24word@127.0.0.1:5433/arbitrage?schema=public");
    expect(parsed).toMatchObject({ PGHOST: "127.0.0.1", PGPORT: "5433", PGUSER: "test", PGPASSWORD: "p@ss$word", PGDATABASE: "arbitrage" });
    expect(localBackupConnection("postgres://test@[::1]/arbitrage").PGHOST).toBe("::1");
  });
  it("accepts literal executable paths with spaces but never shell commands or unknown flags", () => {
    expect(backupArguments(["--pg-bin", "C:\\Program Files\\PostgreSQL\\17\\bin", "--output-dir", "D:\\Private Backups"])).toEqual({ pgBin: "C:\\Program Files\\PostgreSQL\\17\\bin", outputDir: "D:\\Private Backups" });
    for (const args of [["--clean"], ["--output-dir"], ["--pg-bin", "one", "--pg-bin", "two"], ["--pg-bin", "--output-dir"]]) expect(() => backupArguments(args)).toThrow();
  });
  it("does not leak app secrets or inherited libpq overrides to child tools", () => {
    const keys = ["CJ_ACCESS_TOKEN", "APP_PASSWORD_HASH", "PGOPTIONS", "PGSERVICE", "PGDATABASE"] as const;
    const old = Object.fromEntries(keys.map(k => [k, process.env[k]]));
    try {
      for (const key of keys) process.env[key] = "PRIVATE TEST VALUE";
      const env = toolEnvironment(localBackupConnection("postgresql://test:secret@localhost/arbitrage"));
      expect(env.PGDATABASE).toBe("arbitrage");
      for (const key of keys.filter(k => k !== "PGDATABASE")) expect(env[key]).toBeUndefined();
    } finally { for (const key of keys) { if (old[key] === undefined) delete process.env[key]; else process.env[key] = old[key]; } }
  });
});
