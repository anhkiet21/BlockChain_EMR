import type { Metadata } from "next";
import Link from "next/link";
import { SessionBar } from "@/components/session-bar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Blockchain EMR",
  description: "Electronic medical records with patient-controlled access",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body>
        <header className="border-b border-slate-200 bg-white">
          <nav className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-5 py-4">
            <div className="flex flex-wrap items-center gap-4">
              <Link className="text-lg font-bold text-blue-800" href="/">Blockchain EMR</Link>
              <Link className="nav-link" href="/dashboard">Dashboard</Link>
              <Link className="nav-link" href="/profile">Profile</Link>
              <Link className="nav-link" href="/patient/access">Patient</Link>
              <Link className="nav-link" href="/doctor/records">Doctor</Link>
              <Link className="nav-link" href="/admin">Admin</Link>
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
