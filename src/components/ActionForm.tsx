"use client";
import { useActionState, type ReactNode } from "react";
export function ActionForm({ action, children, label }: {
  action: (state: string, data: FormData) => Promise<string>; children: ReactNode; label: string;
}) {
  const [message, formAction, pending] = useActionState(action, "");
  return <form action={formAction}>{children}<div className="bar"><button className="primary" disabled={pending}>{pending ? "Working…" : label}</button><span role="status">{message}</span></div></form>;
}
