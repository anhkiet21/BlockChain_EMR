"use client";

import { FormEvent, useState } from "react";
import { publicApi, Session, setSession } from "@/lib/api/client";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("password123");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("PATIENT");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const session = await publicApi<Session>("/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password, fullName, role }),
      });
      setSession(session);
      location.href = "/dashboard";
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Dang ky that bai");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mx-auto max-w-md py-10">
      <form className="card grid gap-4" onSubmit={submit}>
        <div>
          <p className="label">Tao tai khoan test</p>
          <h1 className="mt-2 text-2xl font-bold">Dang ky</h1>
        </div>
        <label className="grid gap-1 text-sm font-medium">Email<input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label className="grid gap-1 text-sm font-medium">Mat khau<input className="input" type="password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        <label className="grid gap-1 text-sm font-medium">Ho ten<input className="input" required value={fullName} onChange={(e) => setFullName(e.target.value)} /></label>
        <label className="grid gap-1 text-sm font-medium">Vai tro<select className="input" value={role} onChange={(e) => setRole(e.target.value)}><option>PATIENT</option><option>DOCTOR</option></select></label>
        {message && <p className="status">{message}</p>}
        <button className="btn-primary" disabled={busy}>{busy ? "Dang tao..." : "Dang ky"}</button>
        <p className="text-xs text-slate-500">ADMIN khong duoc tu dang ky; dung tai khoan seed admin@test.local.</p>
      </form>
    </section>
  );
}
