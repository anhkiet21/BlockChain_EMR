import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Blockchain EMR",
  description: "Electronic medical records with patient-controlled access",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body>
        <header className="border-b bg-white">
          <nav className="mx-auto flex max-w-6xl gap-6 px-6 py-4">
            <Link className="font-semibold text-blue-700" href="/">Blockchain EMR</Link>
            <Link href="/doctor/records">Bác sĩ</Link>
            <Link href="/patient/access">Bệnh nhân</Link>
          </nav>
        </header>
        <main className="mx-auto max-w-6xl p-6">{children}</main>
      </body>
    </html>
  );
}

