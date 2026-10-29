"use client";
import { useActionState, useRef, useState, useTransition, type ReactNode } from "react";
import { unstable_rethrow } from "next/navigation";
export function ActionForm({ action, children, label }: {
  action: (state: string, data: FormData) => Promise<string>; children: ReactNode; label: string;
}) {
  // Retain the server reference for native/progressive form submissions.
  const [serverMessage, formAction] = useActionState(action, "");
  const [clientMessage, setClientMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const inFlight = useRef(false);
  return <form action={formAction} aria-busy={pending} onSubmit={event => {
    event.preventDefault();
    if (inFlight.current) return;
    const data = new FormData(event.currentTarget);
    inFlight.current = true;
    // Manual invocation avoids uncontrolled-field resets on recoverable errors.
    startTransition(async () => {
      try { setClientMessage(await action(clientMessage ?? serverMessage, data)); }
      catch (error) { unstable_rethrow(error); setClientMessage("Could not confirm the save. Your entries are kept. Check the current record before trying again."); }
      finally { inFlight.current = false; }
    });
  }}>{children}<div className="bar"><button className="primary" disabled={pending}>{pending ? "Working…" : label}</button><span role="status">{clientMessage ?? serverMessage}</span></div></form>;
}
