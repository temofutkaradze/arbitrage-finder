import * as http from "node:http";
let configured = false;
/** Keep fetch on the managed HTTPS proxy, including destination-scoped tokens. */
export function configureProxyFromEnvironment() {
  if (configured) return;
  if (process.env.HTTPS_PROXY || process.env.https_proxy || process.env.HTTP_PROXY || process.env.http_proxy) {
    // Node 24 provides this for both native HTTP agents and the fetch dispatcher.
    const runtime = http as typeof http & { setGlobalProxyFromEnv?: () => unknown };
    if (!runtime.setGlobalProxyFromEnv) throw new Error("CJ proxy support requires Node.js 24 with setGlobalProxyFromEnv.");
    try { runtime.setGlobalProxyFromEnv(); }
    catch { throw new Error("CJ proxy configuration could not be initialised."); }
  }
  configured = true;
}
