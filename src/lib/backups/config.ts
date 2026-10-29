export class BackupError extends Error {}
export function localBackupConnection(raw: string | undefined) {
  try {
    if (!raw) throw new Error();
    const url = new URL(raw);
    if (!["postgres:", "postgresql:"].includes(url.protocol) || !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) || url.pathname !== "/arbitrage" || url.hash) throw new Error();
    for (const [key, value] of url.searchParams) if (key !== "schema" || value !== "public") throw new Error();
    const user = decodeURIComponent(url.username), password = decodeURIComponent(url.password);
    if (!user || /[\x00\r\n]/.test(user + password)) throw new Error();
    return { PGHOST: url.hostname.replace(/^\[|\]$/g, ""), PGPORT: url.port || "5432", PGUSER: user, PGPASSWORD: password, PGDATABASE: "arbitrage", PGCONNECT_TIMEOUT: "10", PGSSLMODE: "prefer" };
  } catch { throw new BackupError("Backup requires a local PostgreSQL DATABASE_URL for arbitrage with an explicit role. Only schema=public is accepted as a URL option. No connection string was logged."); }
}
export function backupArguments(args: string[]) {
  const result: { pgBin?: string; outputDir?: string } = {};
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i], value = args[i+1];
    if (!["--pg-bin", "--output-dir"].includes(key) || !value || value.startsWith("--")) throw new BackupError("Usage: npm run db:backup -- [--pg-bin path-to-PostgreSQL-bin] [--output-dir private-backup-folder]");
    const field = key === "--pg-bin" ? "pgBin" : "outputDir";
    if (result[field]) throw new BackupError("Duplicate backup argument.");
    result[field] = value;
  }
  return result;
}
// Do not forward app secrets, proxy credentials, libpq service files/options or
// inherited PGDATABASE/PGHOST overrides into the PostgreSQL subprocess.
export function toolEnvironment(connection?: ReturnType<typeof localBackupConnection>): NodeJS.ProcessEnv {
  const out: NodeJS.ProcessEnv = { NODE_ENV: process.env.NODE_ENV ?? "production" };
  for (const key of ["PATH", "Path", "SystemRoot", "WINDIR", "TEMP", "TMP", "TMPDIR", "LD_LIBRARY_PATH", "LANG"]) if (process.env[key]) out[key] = process.env[key];
  return { ...out, ...connection };
}
