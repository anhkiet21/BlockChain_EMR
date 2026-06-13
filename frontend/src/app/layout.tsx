import type { Metadata } from "next";
import Link from "next/link";
import { SessionBar } from "@/components/session-bar";
import "./globals.css";

export const metadata: Metadata = {
  title: "MedChain EMR",
  description: "Hồ sơ bệnh án điện tử với quyền truy cập do bệnh nhân kiểm soát",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body>
        <header className="sticky top-0 z-30 border-b border-white/70 bg-white/85 backdrop-blur-xl">
          <nav className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-5 py-4">
            <div className="flex flex-wrap items-center gap-4">
              <Link className="flex items-center gap-3 text-lg font-black text-cyan-900" href="/">
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-cyan-600 to-blue-700 text-white shadow-sm">M</span>
                <span>MedChain EMR</span>
              </Link>
              <Link className="nav-link" href="/dashboard">Tổng quan</Link>
              <Link className="nav-link" href="/profile">Hồ sơ</Link>
              <Link className="nav-link" href="/patient/access">Quyền truy cập</Link>
              <Link className="nav-link" href="/patient/records">Bệnh án</Link>
              <Link className="nav-link" href="/doctor/records">Bác sĩ</Link>
              <Link className="nav-link" href="/admin">Quản trị</Link>
              <Link className="nav-link" href="/blockchain">Blockchain</Link>
            </div>
            <SessionBar />
          </nav>
        </header>
        <main className="mx-auto max-w-7xl p-5 md:p-8">{children}</main>
      </body>
    </html>
  );
}
