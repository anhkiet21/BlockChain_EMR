"use client";

import { FormEvent, useState } from "react";
import { ApiClientError, publicApi, Session, setSession } from "@/lib/api/client";

const TEST_ACCOUNTS = [
  { label: "Patient", email: "patient@test.local", password: "password123" },
  { label: "Doctor", email: "doctor@test.local", password: "password123" },
  { label: "Admin", email: "admin@test.local", password: "password123" },
];

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const session = await publicApi<Session>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setSession(session);
      location.href = "/dashboard";
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 403) {
        setMessage("Dang nhap bi tu choi (403). Kiem tra tai khoan hoac doi 1 phut neu vua thu qua nhieu lan.");
      } else {
        setMessage(error instanceof Error ? error.message : "Dang nhap that bai");
      }
    } finally {
      setBusy(false);
    }
  }

  function fillTestAccount(account: (typeof TEST_ACCOUNTS)[number]) {
    setEmail(account.email);
    setPassword(account.password);
    setMessage("");
  }

  return (
    <section className="mx-auto max-w-md py-10">
      <form className="card grid gap-4" onSubmit={submit}>
        <div>
          <p className="label">Phien lam viec bao mat</p>
          <h1 className="mt-2 text-2xl font-bold">Dang nhap</h1>
        </div>
        <label className="grid gap-1 text-sm font-medium">
          Email
          <input className="input" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Mat khau
          <input
            className="input"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        <div className="rounded-xl border border-dashed border-slate-300 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tai khoan test</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {TEST_ACCOUNTS.map((account) => (
              <button
                key={account.email}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                type="button"
                onClick={() => fillTestAccount(account)}
              >
                {account.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-500">Mat khau chung: password123</p>
        </div>
        {message && <p className="status">{message}</p>}
        <button className="btn-primary" disabled={busy}>
          {busy ? "Dang dang nhap..." : "Dang nhap"}
        </button>
        <a className="btn-secondary" href="/register">Tao tai khoan Patient/Doctor moi</a>
        <p className="text-xs text-slate-500">Token chi duoc giu trong sessionStorage va bi xoa khi dong tab.</p>
      </form>
    </section>
  );
}
