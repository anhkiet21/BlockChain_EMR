"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch, getSession, setSession, Session } from "@/lib/api/client";

export function SessionBar() {
  const [session, setCurrent] = useState<Session | null>(null);
  useEffect(() => {
    const sync = () => setCurrent(getSession());
    sync();
    window.addEventListener("emr-session-change", sync);
    return () => window.removeEventListener("emr-session-change", sync);
  }, []);

  async function logout() {
    if (session) {
      await apiFetch("/auth/logout", { method: "POST", body: JSON.stringify({ refreshToken: session.refreshToken }) }).catch(() => null);
    }
    setSession(null);
    location.href = "/login";
  }

  return session ? (
    <div className="flex flex-wrap items-center justify-end gap-2 text-sm">
      <Link className="btn-secondary" href="/dashboard">{session.user.roles.join(", ")}</Link>
      <span className="hidden text-slate-600 lg:inline">{session.user.fullName}</span>
      <button className="btn-secondary" onClick={logout}>Logout</button>
    </div>
  ) : (
    <div className="flex gap-2">
      <Link className="btn-secondary" href="/register">Register</Link>
      <Link className="btn-primary" href="/login">Login</Link>
    </div>
  );
}
