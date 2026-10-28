/** Safety guards: the app only ever touches the `arbitrage` database. No dependencies. */
export const MAIN_DB = "arbitrage";
export const SHADOW_DB = "arbitrage_shadow";

export function dbName(url: string | undefined): string {
  if (!url) throw new Error("Database URL is missing from .env");
  try {
    return decodeURIComponent(new URL(url).pathname.replace(/^\//, ""));
  } catch {
    throw new Error("Database URL is not a valid URL (special characters in the password must be URL-encoded)");
  }
}

export function assertMainDatabase(url: string | undefined): void {
  const name = dbName(url);
  if (name !== MAIN_DB) throw new Error(`Refusing to run: DATABASE_URL points to "${name}", expected "${MAIN_DB}".`);
}

export function assertSafeDatabaseUrls(main: string | undefined, shadow: string | undefined): void {
  assertMainDatabase(main);
  const s = dbName(shadow);
  if (s !== SHADOW_DB) throw new Error(`Refusing to run: SHADOW_DATABASE_URL points to "${s}", expected "${SHADOW_DB}".`);
  if (main === shadow) throw new Error("Refusing to run: DATABASE_URL and SHADOW_DATABASE_URL must differ.");
}
