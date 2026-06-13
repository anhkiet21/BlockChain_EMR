"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ApiClientError, publicApi, Session, setSession } from "@/lib/api/client";

const TEST_ACCOUNTS = [
  {
    label: "Bệnh nhân",
    role: "PATIENT",
    email: "patient@test.local",
    password: "password123",
    color: "emerald",
  },
  {
    label: "Bác sĩ",
    role: "DOCTOR",
    email: "doctor@test.local",
    password: "password123",
    color: "indigo",
  },
  {
    label: "Quản trị",
    role: "ADMIN",
    email: "admin@test.local",
    password: "password123",
    color: "violet",
  },
] as const;

type AccountColor = "emerald" | "indigo" | "violet";

const COLOR_MAP: Record<AccountColor, { btn: string; badge: string }> = {
  emerald: {
    btn:   "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 hover:border-emerald-500/50",
    badge: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  },
  indigo: {
    btn:   "border-indigo-500/30 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 hover:border-indigo-500/50",
    badge: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
  },
  violet: {
    btn:   "border-violet-500/30 bg-violet-500/10 text-violet-300 hover:bg-violet-500/20 hover:border-violet-500/50",
    badge: "bg-violet-500/20 text-violet-400 border-violet-500/30",
  },
};

export default function LoginPage() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage]   = useState("");
  const [isError, setIsError]   = useState(false);
  const [busy, setBusy]         = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    setIsError(false);
    try {
      const session = await publicApi<Session>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setSession(session);
      location.href = "/dashboard";
    } catch (err) {
      setIsError(true);
      if (err instanceof ApiClientError && err.status === 403) {
        setMessage(
          "Đăng nhập bị từ chối (403). Kiểm tra lại tài khoản hoặc đợi 1 phút nếu vừa thử quá nhiều lần."
        );
      } else {
        setMessage(
          err instanceof Error ? err.message : "Đăng nhập thất bại. Vui lòng thử lại."
        );
      }
    } finally {
      setBusy(false);
    }
  }

  function fillAccount(acc: (typeof TEST_ACCOUNTS)[number]) {
    setEmail(acc.email);
    setPassword(acc.password);
    setMessage("");
    setIsError(false);
  }

  return (
    <section className="flex min-h-[80vh] items-center justify-center py-10">
      <div className="w-full max-w-md animate-scale-in">

        {/* ── Glassmorphism card ── */}
        <div className="card-glass relative overflow-hidden">

          {/* Glow decorations */}
          <div className="pointer-events-none absolute -top-16 -right-16 h-56 w-56 rounded-full bg-indigo-600/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-violet-600/8  blur-3xl" />

          <div className="relative grid gap-7">

            {/* ── Logo / icon ── */}
            <div className="flex flex-col items-center gap-3 pt-2">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-2xl shadow-indigo-500/40">
                <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
              </div>
              <div className="text-center">
                <h1 className="text-2xl font-black text-white tracking-tight">Đăng nhập</h1>
                <p className="mt-1 text-sm text-slate-500">
                  Phiên làm việc được mã hoá và bảo mật
                </p>
              </div>
            </div>

            {/* ── Form ── */}
            <form onSubmit={handleSubmit} className="grid gap-5">

              {/* Email */}
              <div className="grid gap-2">
                <label className="form-label" htmlFor="email">Email</label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                    <svg className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                    </svg>
                  </span>
                  <input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ten@example.com"
                    className="input pl-11"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="grid gap-2">
                <label className="form-label" htmlFor="password">Mật khẩu</label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                    <svg className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                  </span>
                  <input
                    id="password"
                    type="password"
                    required
                    minLength={8}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="input pl-11"
                  />
                </div>
              </div>

              {/* ── Quick-fill test accounts ── */}
              <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                    Tài khoản test nhanh
                  </p>
                  <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-slate-600">
                    Mật khẩu chung: <span className="font-mono text-amber-500">password123</span>
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {TEST_ACCOUNTS.map((acc) => {
                    const c = COLOR_MAP[acc.color];
                    const isActive = email === acc.email;
                    return (
                      <button
                        key={acc.email}
                        type="button"
                        onClick={() => fillAccount(acc)}
                        className={`flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-xs font-semibold
                                    transition-all duration-200 active:scale-95 ${c.btn}
                                    ${isActive ? "ring-1 ring-white/20" : ""}`}
                      >
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-wide ${c.badge}`}
                        >
                          {acc.role}
                        </span>
                        <span className="text-slate-300">{acc.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── Error / success message ── */}
              {message && (
                <div className={isError ? "alert-error animate-fade-in" : "alert-success animate-fade-in"}>
                  <div className="flex items-start gap-2">
                    {isError ? (
                      <svg className="mt-0.5 h-4 w-4 shrink-0 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                      </svg>
                    ) : (
                      <svg className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                    <span>{message}</span>
                  </div>
                </div>
              )}

              {/* ── Submit ── */}
              <button
                type="submit"
                disabled={busy}
                className="btn-primary w-full py-3 text-base shadow-lg shadow-indigo-600/25"
              >
                {busy ? (
                  <>
                    <span className="spinner border-white/30 border-t-white" />
                    Đang đăng nhập...
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                    </svg>
                    Đăng nhập
                  </>
                )}
              </button>
            </form>

            {/* ── Register link ── */}
            <div className="border-t border-white/5 pt-2 text-center">
              <p className="text-sm text-slate-500">
                Chưa có tài khoản?{" "}
                <Link
                  href="/register"
                  className="font-semibold text-indigo-400 transition-colors hover:text-indigo-300"
                >
                  Đăng ký Bệnh nhân / Bác sĩ mới
                </Link>
              </p>
              <p className="mt-3 text-xs text-slate-700">
                Token chỉ được lưu trong sessionStorage và bị xoá khi đóng tab.
              </p>
            </div>

          </div>
        </div>

        {/* ── Back to home ── */}
        <div className="mt-6 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-slate-600 transition-colors hover:text-slate-400"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Về trang chủ
          </Link>
        </div>

      </div>
    </section>
  );
}
