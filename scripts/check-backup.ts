import { loadEnvConfig } from "@next/env";
import { Client } from "pg";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { createServer } from "node:net";
import { randomUUID, createHash } from "node:crypto";
import { createLocalBackup } from "../src/lib/backups/create";
import { backupArguments, localBackupConnection, toolEnvironment } from "../src/lib/backups/config";
loadEnvConfig(process.cwd(), true, { info() {}, error() {} });
const args = backupArguments(process.argv.slice(2));
const executable = (name: string) => args.pgBin ? join(resolve(args.pgBin), name + (process.platform === "win32" ? ".exe" : "")) : name;
function command(name: string, values: string[]) {
  const result = spawnSync(executable(name), values, { env: toolEnvironment(), stdio: "ignore", timeout: 60_000, windowsHide: true });
  if (result.status !== 0) throw new Error(`Isolated backup check failed at ${name}; no database logs or credentials printed.`);
}
async function availablePort() {
  const server = createServer(); await new Promise<void>((accept, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", accept); });
  const address = server.address(); assert.ok(address && typeof address !== "string");
  await new Promise<void>((accept, reject) => server.close(e => e ? reject(e) : accept())); return address.port;
}
const quote = (s: string) => '"' + s.replaceAll('"', '""') + '"';
async function fingerprints(client: Client) {
  const tables = await client.query<{ tablename: string }>("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename");
  const result: Record<string, string> = {};
  for (const { tablename } of tables.rows) {
    if (["OwnerSession", "OwnerLoginState"].includes(tablename)) continue;
    const { rows } = await client.query(`SELECT count(*)::text AS count, md5(coalesce(string_agg(row_to_json(t)::text, '' ORDER BY row_to_json(t)::text), '')) AS hash FROM public.${quote(tablename)} t`);
    result[tablename] = rows[0].count + ":" + rows[0].hash;
  }
  return result;
}
async function main() {
  localBackupConnection(process.env.DATABASE_URL); // Before any source connection or fixture write.
  const root = await mkdtemp(join(tmpdir(), "arbitrage-backup-check-")), cluster = join(root, "pgdata");
  const source = new Client({ connectionString: process.env.DATABASE_URL }), port = await availablePort();
  const restoreUrl = `postgresql://backupcheck@127.0.0.1:${port}/arbitrage`, restored = new Client({ connectionString: restoreUrl });
  let initialized = false, connected = false, opportunityId: number | undefined;
  const sessionId = "backup-check-" + randomUUID();
  try {
    await source.connect(); connected = true;
    const fixture = await source.query('INSERT INTO "Opportunity" (name,notes,"updatedAt") VALUES ($1,$2,now()) RETURNING id', ["BACKUP CHECK FIXTURE", "Temporary round-trip verification fixture; removed after check."]); opportunityId = fixture.rows[0].id;
    await source.query('INSERT INTO "OwnerSession" (id,"passwordVersion","expiresAt") VALUES ($1,$2,$3)', [sessionId, "TEST ONLY", new Date(0)]);
    const before = await fingerprints(source);
    await assert.rejects(createLocalBackup({ databaseUrl: process.env.DATABASE_URL, pgBin: args.pgBin, outputDir: "." }), /outside the project/);
    const backup = await createLocalBackup({ databaseUrl: process.env.DATABASE_URL, pgBin: args.pgBin, outputDir: join(root, "backups") });
    assert.equal((await readFile(backup.archive)).subarray(0,5).toString(), "PGDMP");
    const manifest = JSON.parse(await readFile(join(backup.directory, "manifest.json"), "utf8"));
    assert.equal(manifest.sha256, createHash("sha256").update(await readFile(backup.archive)).digest("hex"));
    command("initdb", ["-D", cluster, "-U", "backupcheck", "--auth=trust", "--encoding=UTF8", "--no-locale"]); initialized = true;
    command("pg_ctl", ["-D", cluster, "-l", join(root, "postgres.log"), "-o", `-h 127.0.0.1 -k ${root} -p ${port}`, "-w", "start"]);
    const admin = new Client({ connectionString: `postgresql://backupcheck@127.0.0.1:${port}/postgres` });
    try { await admin.connect(); await admin.query('CREATE DATABASE "arbitrage"'); } finally { await admin.end(); }
    command("pg_restore", ["--no-owner", "--no-privileges", "--single-transaction", "--exit-on-error", `--dbname=${restoreUrl}`, backup.archive]);
    await restored.connect(); assert.deepEqual(await fingerprints(restored), before);
    assert.equal((await restored.query('SELECT count(*)::int AS n FROM "OwnerSession"')).rows[0].n, 0);
    assert.equal((await restored.query('SELECT count(*)::int AS n FROM "OwnerLoginState"')).rows[0].n, 0);
    assert.deepEqual(await fingerprints(source), before);
    // A connection failure must leave no partial or successful archive behind.
    const badParent = join(root, "failed-backups");
    await assert.rejects(createLocalBackup({ databaseUrl: `postgresql://invalid:invalid@127.0.0.1:${port}/arbitrage`, pgBin: args.pgBin, outputDir: badParent }));
    assert.deepEqual(await readdir(badParent), []);
    console.log("PASS: real custom archive/checksum, isolated PostgreSQL restore with matching business tables and migration history, excluded live sessions, preserved source records and failed-backup cleanup");
  } finally {
    await restored.end();
    if (connected) { if (opportunityId) await source.query('DELETE FROM "Opportunity" WHERE id=$1', [opportunityId]); await source.query('DELETE FROM "OwnerSession" WHERE id=$1', [sessionId]); }
    await source.end();
    if (initialized) {
      const status = spawnSync(executable("pg_ctl"), ["-D", cluster, "status"], { env: toolEnvironment(), stdio: "ignore" });
      if (status.status === 0) command("pg_ctl", ["-D", cluster, "-m", "fast", "-w", "stop"]);
    }
    await rm(root, { recursive: true, force: true });
  }
}
main().catch(() => { console.error("Backup round-trip check failed. Check PostgreSQL tools, local source access and free disk space. No existing database was reset or restored over."); process.exitCode = 1; });
