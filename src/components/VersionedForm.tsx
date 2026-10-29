"use client";
import { useActionState, useRef, useState, useTransition, type ReactNode } from "react";
import { unstable_rethrow } from "next/navigation";
import type { EditResult } from "@/lib/forms/editing";
export function VersionedForm({ action, version, latestUrl, label, children }: {
  action: (state: EditResult, data: FormData) => Promise<EditResult>; version: number; latestUrl: string; label: string; children: ReactNode;
}) {
  const initial = { message: "", saved: false, conflict: false, version };
  const [server, dispatch] = useActionState(action, initial);
  const [client, setClient] = useState<EditResult | null>(null);
  // Never silently adopt new RSC props while old uncontrolled inputs are being edited.
  const [baseVersion, setBaseVersion] = useState(server.version);
  const [pending, startTransition] = useTransition();
  const busy = useRef(false), result = client ?? server;
  return <form action={dispatch} aria-busy={pending} onSubmit={event => {
    event.preventDefault(); if (busy.current) return;
    const data = new FormData(event.currentTarget); busy.current = true;
    startTransition(async () => {
      try {
        const next = await action(result, data); setClient(next);
        if (next.saved) setBaseVersion(next.version);
      } catch (error) {
        unstable_rethrow(error);
        setClient({ message: "Could not confirm the save. Your entries are kept. Check the latest saved record before trying again.", saved: false, conflict: false, version: baseVersion });
      } finally { busy.current = false; }
    });
  }}>
    <input type="hidden" name="expectedVersion" value={baseVersion}/>
    {children}
    <div className="bar"><button className="primary" disabled={pending}>{pending ? "Working…" : label}</button><span role="status">{result.message}</span></div>
    {(result.conflict || (result.message && !result.saved)) && <p><a href={latestUrl} target="_blank" rel="noopener noreferrer">Open latest saved version in a new tab</a> · Keep this tab to compare your unsaved entries. Saving from the old version will remain blocked.</p>}
  </form>;
}
