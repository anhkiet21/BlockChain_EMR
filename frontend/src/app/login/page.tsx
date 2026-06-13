"use client";

import { FormEvent, useState } from "react";
import { publicApi, Session, setSession } from "@/lib/api/client";

const TEST_ACCOUNTS = [
  { label: "Patient", identifier: "079000000001" },
  { label: "Doctor", identifier: "079000000002" },
  { label: "Admin", identifier: "admin@test.local" },
];

export default function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("password123");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const body = identifier.includes("@") ? { email: identifier, password } : { identityNumber: identifier, password };
      const session = await publicApi<Session>("/auth/login", { method: "POST", body: JSON.stringify(body) });
      setSession(session); location.href = "/dashboard";
    } catch (error) { setMessage(error instanceof Error ? error.message : "Dang nhap that bai"); }
    finally { setBusy(false); }
  }

  return <section className="mx-auto max-w-md py-10">
    <form className="card grid gap-4" onSubmit={submit}>
      <div><p className="label">Blockchain EMR</p><h1 className="mt-2 text-2xl font-bold">Dang nhap</h1></div>
      <label className="grid gap-1 text-sm font-medium">CCCD / ma dinh danh
        <input className="input" required value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="Admin co the dung email" />
      </label>
      <label className="grid gap-1 text-sm font-medium">Mat khau
        <input className="input" type="password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} />
      </label>
      <div className="flex flex-wrap gap-2">{TEST_ACCOUNTS.map((account) =>
        <button className="btn-secondary" type="button" key={account.label} onClick={() => setIdentifier(account.identifier)}>{account.label}</button>)}</div>
      {message && <p className="status">{message}</p>}
      <button className="btn-primary" disabled={busy}>{busy ? "Dang dang nhap..." : "Dang nhap"}</button>
      <a className="btn-secondary" href="/register">Dang ky Patient / Doctor</a>
    </form>
  </section>;
}
