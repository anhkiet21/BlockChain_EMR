"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { publicApi, Session, setSession } from "@/lib/api/client";

const TEST_ACCOUNTS = [
  { label: "Bệnh nhân", identifier: "079000000001" },
  { label: "Bác sĩ", identifier: "079000000002" },
  { label: "Quản trị", identifier: "admin@test.local" },
];

export default function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("password123");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const body = identifier.includes("@") ? { email: identifier, password } : { identityNumber: identifier, password };
      const session = await publicApi<Session>("/auth/login", { method: "POST", body: JSON.stringify(body) });
      setSession(session);
      location.href = "/dashboard";
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Đăng nhập thất bại");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mx-auto grid max-w-5xl gap-6 py-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
      <div className="card">
        <p className="badge">MedChain EMR</p>
        <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950 md:text-4xl">Đăng nhập hệ thống</h1>
        <p className="mt-3 leading-7 text-slate-600">
          Truy cập hồ sơ bệnh án, ký giao dịch bằng MetaMask và kiểm thử các luồng bảo mật theo vai trò.
        </p>
        <div className="mt-6 grid gap-3">
          <p className="label">Tài khoản test</p>
          {TEST_ACCOUNTS.map((account) => (
            <button
              className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-semibold text-slate-700 transition hover:border-cyan-200 hover:bg-cyan-50"
              type="button"
              key={account.label}
              onClick={() => setIdentifier(account.identifier)}
            >
              <span>{account.label}</span>
              <span className="font-mono text-xs text-slate-500">{account.identifier}</span>
            </button>
          ))}
        </div>
      </div>

      <form className="card grid gap-4" onSubmit={submit}>
        <div>
          <p className="label">Xác thực</p>
          <h2 className="mt-2 text-2xl font-black">Nhập thông tin đăng nhập</h2>
        </div>
        <label className="grid gap-2 text-sm font-bold text-slate-700">
          CCCD / mã định danh
          <input
            className="input"
            required
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="Admin có thể dùng email"
          />
        </label>
        <label className="grid gap-2 text-sm font-bold text-slate-700">
          Mật khẩu
          <input
            className="input"
            type="password"
            minLength={8}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {message && <p className="status">{message}</p>}
        <button className="btn-primary" disabled={busy}>{busy ? "Đang đăng nhập..." : "Đăng nhập"}</button>
        <Link className="btn-secondary" href="/register">Tạo tài khoản bệnh nhân / bác sĩ</Link>
      </form>
    </section>
  );
}
