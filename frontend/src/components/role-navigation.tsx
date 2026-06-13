"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSession, Session } from "@/lib/api/client";

type NavigationLink = { href: string; label: string };

const ROLE_LINKS: Record<string, NavigationLink[]> = {
  PATIENT: [
    { href: "/patient/access", label: "Quyền truy cập" },
    { href: "/patient/records", label: "Bệnh án" },
  ],
  DOCTOR: [
    { href: "/doctor/records", label: "Bác sĩ" },
  ],
  ADMIN: [
    { href: "/admin", label: "Quản trị" },
    { href: "/blockchain", label: "Kiểm tra hệ thống" },
  ],
};

export function RoleNavigation() {
  const [session, setCurrent] = useState<Session | null>(null);

  useEffect(() => {
    const sync = () => setCurrent(getSession());
    sync();
    window.addEventListener("emr-session-change", sync);
    return () => window.removeEventListener("emr-session-change", sync);
  }, []);

  if (!session) return null;

  const links = session.user.roles.flatMap((role) => ROLE_LINKS[role] ?? []);
  const uniqueLinks = Array.from(new Map(links.map((link) => [link.href, link])).values());

  return (
    <>
      <Link className="nav-link" href="/dashboard">Tổng quan</Link>
      <Link className="nav-link" href="/profile">Hồ sơ</Link>
      {uniqueLinks.map((link) => (
        <Link className="nav-link" href={link.href} key={link.href}>
          {link.label}
        </Link>
      ))}
    </>
  );
}
