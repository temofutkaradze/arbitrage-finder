import { loadEnvConfig } from "@next/env";
import { backupArguments, BackupError } from "../src/lib/backups/config";
import { createLocalBackup } from "../src/lib/backups/create";
async function main() {
  const args = backupArguments(process.argv.slice(2));
  loadEnvConfig(process.cwd(), true, { info() {}, error() {} });
  const result = await createLocalBackup({ ...args, databaseUrl: process.env.DATABASE_URL });
  console.log(`Backup created and archive index checked: ${result.archive}`);
  console.log(`SHA-256: ${result.sha256}`);
  console.log("Keep this folder private and copy it to a separate protected drive. Local settings (.env/.env.local) are not included. See docs/LOCAL-BACKUP.md for recovery and verification.");
}
main().catch(e => { console.error(e instanceof BackupError ? e.message : "Backup failed. Check local settings, tool availability and folder permissions. No database was reset or dropped."); process.exitCode = 1; });
