"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSession, Session } from "@/lib/api/client";

const CARDS = [
  { role: "PATIENT", href: "/patient/access", title: "Quản lý quyền truy cập", text: "Cấp, thu hồi quyền cho cơ sở y tế và duyệt yêu cầu bằng MetaMask." },
  { role: "PATIENT", href: "/patient/records", title: "Bệnh án của tôi", text: "Tải lên, xem và quản lý hồ sơ bệnh án cá nhân." },
  { role: "DOCTOR", href: "/doctor/records", title: "Không gian bác sĩ", text: "Tìm bệnh nhân, gửi yêu cầu, tạo bệnh án và tải tệp khi có quyền." },
  { role: "ADMIN", href: "/admin", title: "Quản trị hệ thống", text: "Xác minh, từ chối và khóa tài khoản bác sĩ." },
  { role: "ALL", href: "/profile", title: "Hồ sơ và ví", text: "Cập nhật hồ sơ và liên kết ví bằng chữ ký MetaMask." },
];

const ROLE_LABELS: Record<string, string> = {
  PATIENT: "Bệnh nhân",
  DOCTOR: "Bác sĩ",
  ADMIN: "Quản trị viên",
  ALL: "Tài khoản",
};

export default function DashboardPage() {
  const [session, setSessionState] = useState<Session | null>(null);

  useEffect(() => setSessionState(getSession()), []);

  if (!session) {
    return (
      <section className="mx-auto max-w-xl py-10">
        <div className="card text-center">
          <p className="badge mx-auto">Cần xác thực</p>
          <h1 className="mt-3 text-2xl font-black">Bạn chưa đăng nhập</h1>
          <p className="mt-2 text-slate-600">Đăng nhập để sử dụng các chức năng của hệ thống.</p>
          <Link className="btn-primary mt-5" href="/login">Đến trang đăng nhập</Link>
        </div>
      </section>
    );
  }

  const roles = session.user.roles;
  const visible = CARDS.filter((card) => card.role === "ALL" || roles.includes(card.role));

  return (
    <section className="grid gap-6">
      <div>
        <p className="badge">Bảng điều khiển</p>
        <h1 className="mt-3 section-title">Tổng quan</h1>
        <p className="mt-2 text-slate-600">
          Xin chào, {session.user.fullName} · {roles.map((role) => ROLE_LABELS[role] ?? role).join(", ")}
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visible.map((card) => (
          <Link className="card transition hover:border-cyan-200 hover:shadow-xl" href={card.href} key={card.href}>
            <p className="badge">{ROLE_LABELS[card.role] ?? card.role}</p>
            <h2 className="mt-3 text-lg font-black">{card.title}</h2>
            <p className="mt-2 muted">{card.text}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
