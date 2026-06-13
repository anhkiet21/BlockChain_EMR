import type { Metadata } from "next";
import Link from "next/link";
import { SessionBar } from "@/components/session-bar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Blockchain EMR — Hồ sơ bệnh án điện tử",
  description: "Ứng dụng quản lý hồ sơ bệnh án điện tử với công nghệ Blockchain — bảo mật, minh bạch và bất biến.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        {/* ── Top navigation bar ── */}
        <header className="sticky top-0 z-40 border-b border-white/5 bg-slate-950/80 backdrop-blur-xl">
          <nav className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-5 py-3">
            {/* Logo */}
            <Link
              href="/"
              className="flex items-center gap-2.5 group"
            >
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 group-hover:shadow-indigo-500/50 transition-all">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
              </div>
              <span className="text-base font-bold text-white tracking-tight">
                Blockchain <span className="gradient-text">EMR</span>
              </span>
            </Link>

            {/* Nav links */}
            <div className="hidden md:flex items-center gap-1">
              <Link className="nav-link" href="/dashboard">Dashboard</Link>
              <Link className="nav-link" href="/profile">Hồ sơ</Link>
              <Link className="nav-link" href="/patient/access">Bệnh nhân</Link>
              <Link className="nav-link" href="/doctor/records">Bác sĩ</Link>
              <Link className="nav-link" href="/institution">Cơ sở y tế</Link>
              <Link className="nav-link" href="/admin">Quản trị</Link>
              <Link className="nav-link" href="/blockchain">Blockchain</Link>
            </div>

            {/* Session bar */}
            <SessionBar />
          </nav>
        </header>

        {/* ── Main content ── */}
        <main className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-10">
          {children}
        </main>

        {/* ── Background decoration ── */}
        <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-indigo-600/5 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-violet-600/5 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-slate-800/20 blur-3xl" />
        </div>
      </body>
    </html>
  );
}
