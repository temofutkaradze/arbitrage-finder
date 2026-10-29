import { spawn } from "node:child_process";
import { createReadStream } from "node:fs";
import { access, mkdir, open, realpath, rename, rm, writeFile } from "node:fs/promises";
import { resolve, join, relative, isAbsolute, sep } from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { BackupError, localBackupConnection, toolEnvironment } from "./config";
export const EXCLUDED_TABLE_DATA = ['public."OwnerSession"', 'public."OwnerLoginState"'];
async function command(executable: string, args: string[], env: NodeJS.ProcessEnv, output?: number, capture = false): Promise<string> {
  return new Promise((accept, reject) => {
    const child = spawn(executable, args, { shell: false, windowsHide: true, env, stdio: ["ignore", output ?? (capture ? "pipe" : "ignore"), "ignore"] });
    let result = "", timedOut = false;
    const timer = setTimeout(() => { timedOut = true; child.kill(); }, 10 * 60_000);
    child.stdout?.on("data", chunk => { if (result.length < 4096) result += String(chunk).slice(0, 4096 - result.length); });
    child.on("error", () => { clearTimeout(timer); reject(new BackupError("PostgreSQL backup tool could not start. Set --pg-bin to the folder containing pg_dump and pg_restore.")); });
    child.on("close", code => { clearTimeout(timer); if (code !== 0 || timedOut) reject(new BackupError("PostgreSQL backup or archive check failed. Verify local PostgreSQL access, disk space and compatible pg_dump/pg_restore versions. No credentials or provider output were logged.")); else accept(result); });
  });
}
export async function createLocalBackup(options: { databaseUrl: string | undefined; pgBin?: string; outputDir?: string }) {
  const connection = localBackupConnection(options.databaseUrl);
  const suffix = process.platform === "win32" ? ".exe" : "";
  const tool = (name: string) => options.pgBin ? join(resolve(options.pgBin), name + suffix) : name + suffix;
  const dump = tool("pg_dump"), restore = tool("pg_restore"), env = toolEnvironment(connection);
  const version = (await command(dump, ["--version"], toolEnvironment(), undefined, true)).match(/PostgreSQL\)\s+(\d+(?:\.\d+)*)/)?.[1];
  if (!version) throw new BackupError("Could not identify pg_dump version.");
  // Reject backing up inside this code checkout: dumps belong outside Git/Docker.
  const parent = resolve(options.outputDir ?? "../arbitrage-finder-backups"), root = resolve(".");
  const outside = (base: string, target: string) => { const rel = relative(base, target); return isAbsolute(rel) || rel === ".." || rel.startsWith(".." + sep); };
  if (!outside(root, parent)) throw new BackupError("Choose a private backup folder outside the project checkout.");
  await mkdir(parent, { recursive: true, mode: 0o700 });
  if (!outside(await realpath(root), await realpath(parent))) throw new BackupError("Backup folder resolves inside the project checkout. Choose a private folder outside it.");
  const now = new Date(), directory = join(parent, `arbitrage-${now.toISOString().replace(/[:.]/g, "-")}-${randomUUID()}`);
  await mkdir(directory, { mode: 0o700 });
  const partial = join(directory, "database.dump.partial"), archive = join(directory, "database.dump");
  try {
    const file = await open(partial, "wx", 0o600);
    try { await command(dump, ["--format=custom", "--no-owner", "--no-privileges", "--no-password", ...EXCLUDED_TABLE_DATA.map(t => `--exclude-table-data=${t}`)], env, file.fd); }
    finally { await file.close(); }
    const check = await open(partial, "r");
    try { const bytes = Buffer.alloc(5); await check.read(bytes, 0, 5, 0); if (bytes.toString("ascii") !== "PGDMP") throw new BackupError("Backup archive header was invalid."); }
    finally { await check.close(); }
    // Offline TOC validation. A real restore rehearsal is still required for recovery assurance.
    await command(restore, ["--list", partial], toolEnvironment());
    const hash = createHash("sha256");
    for await (const chunk of createReadStream(partial)) hash.update(chunk);
    const sha256 = hash.digest("hex");
    await rename(partial, archive);
    await writeFile(join(directory, "manifest.json"), JSON.stringify({ format: "arbitrage-local-backup-v1", database: "arbitrage", createdAtUtc: now.toISOString(), archive: "database.dump", pgDumpVersion: version, sha256, excludedTableData: ["OwnerSession", "OwnerLoginState"], containsCredentialsFile: false, validation: "pg_restore --list; not a restore rehearsal" }, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    await access(archive);
    return { directory, archive, sha256 };
  } catch (e) {
    await rm(directory, { recursive: true, force: true });
    if (e instanceof BackupError) throw e;
    throw new BackupError("Backup file could not be completed. Check private folder permissions and free disk space. Incomplete files were removed when possible.");
  }
}
