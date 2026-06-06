"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSession, Session } from "@/lib/api/client";

const CARDS = [
  { role: "PATIENT", href: "/patient/access", title: "Quan ly quyen truy cap", text: "Cap/huy quyen bac si bang MetaMask va xem lich su." },
  { role: "PATIENT", href: "/patient/files", title: "File benh an cua toi", text: "Upload file rieng, xem danh sach va tai lai file da ma hoa/lien ket storage." },
  { role: "DOCTOR", href: "/doctor/records", title: "Quan ly benh an", text: "Tim benh nhan, upload IPFS, tao benh an va tai file khi co quyen." },
  { role: "ADMIN", href: "/admin", title: "Quan tri", text: "Quan ly khoa phong, xac minh bac si va dong bo blockchain events." },
  { role: "ALL", href: "/profile", title: "Ho so va vi", text: "Cap nhat profile va lien ket vi bang chu ky MetaMask." },
  { role: "ALL", href: "/blockchain", title: "Blockchain tools", text: "Kiem tra access, transaction va record on-chain." },
];

export default function DashboardPage() {
  const [session, setSessionState] = useState<Session | null>(null);

  useEffect(() => setSessionState(getSession()), []);

  if (!session) {
    return (
      <section className="mx-auto max-w-xl py-10">
        <div className="card text-center">
          <h1 className="text-2xl font-bold">Can dang nhap</h1>
          <p className="mt-2 text-slate-600">Dang nhap bang tai khoan test de chay tron bo flow.</p>
          <Link className="btn-primary mt-5" href="/login">Den trang dang nhap</Link>
        </div>
      </section>
    );
  }

  const roles = session.user.roles;
  const visible = CARDS.filter((card) => card.role === "ALL" || roles.includes(card.role));

  return (
    <section className="grid gap-6">
      <div>
        <p className="label text-blue-700">Test dashboard</p>
        <h1 className="mt-2 text-3xl font-bold">Chay test theo vai tro</h1>
        <p className="mt-2 text-slate-600">{session.user.fullName} · {roles.join(", ")}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visible.map((card) => (
          <Link className="card transition hover:border-blue-300 hover:shadow-md" href={card.href} key={card.href}>
            <h2 className="text-lg font-bold">{card.title}</h2>
            <p className="mt-2 text-sm text-slate-600">{card.text}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
