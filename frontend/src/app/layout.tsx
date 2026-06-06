import type { Metadata } from "next";
import Link from "next/link";
import { SessionBar } from "@/components/session-bar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Blockchain EMR",
  description: "Bệnh án điện tử do bệnh nhân kiểm soát quyền truy cập",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body>
        <header className="border-b border-slate-200 bg-white">
          <nav className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-5 py-4">
            <div className="flex items-center gap-6">
              <Link className="text-lg font-bold text-blue-800" href="/">Blockchain EMR</Link>
              <Link className="nav-link" href="/doctor/records">Bác sĩ</Link>
              <Link className="nav-link" href="/patient/access">Bệnh nhân</Link>
            </div>
            <SessionBar />
          </nav>
        </header>
        <main className="mx-auto max-w-7xl p-5 md:p-8">{children}</main>
      </body>
    </html>
  );
}
