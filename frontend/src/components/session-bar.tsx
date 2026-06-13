'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiFetch, getSession, setSession, Session } from '@/lib/api/client';

/* ── Role helpers ─────────────────────────────────────────────────────── */

type Role = 'PATIENT' | 'DOCTOR' | 'ADMIN' | 'INSTITUTION';

const ROLE_LABELS: Record<string, string> = {
  PATIENT:     'Bệnh nhân',
  DOCTOR:      'Bác sĩ',
  ADMIN:       'Quản trị',
  INSTITUTION: 'Cơ sở y tế',
};

const ROLE_BADGE: Record<string, string> = {
  PATIENT:     'badge-indigo',
  DOCTOR:      'badge-emerald',
  ADMIN:       'badge-red',
  INSTITUTION: 'badge bg-teal-500/20 text-teal-300 border border-teal-500/30',
};

const AVATAR_GRADIENTS: Record<string, string> = {
  PATIENT:     'from-indigo-500 to-violet-600',
  DOCTOR:      'from-emerald-500 to-teal-600',
  ADMIN:       'from-red-500 to-rose-600',
  INSTITUTION: 'from-teal-500 to-cyan-600',
};

function getPrimaryRole(roles: string[]): string {
  const order = ['ADMIN', 'DOCTOR', 'INSTITUTION', 'PATIENT'];
  return order.find((r) => roles.includes(r)) ?? (roles[0] ?? 'PATIENT');
}

/* ── Avatar ────────────────────────────────────────────────────────────── */
function Avatar({ name, role }: { name: string; role: string }) {
  const letter = name.trim().charAt(0).toUpperCase() || '?';
  const grad   = AVATAR_GRADIENTS[role] ?? 'from-violet-500 to-purple-600';
  return (
    <div
      className={
        `h-8 w-8 rounded-full bg-gradient-to-br ${grad} flex items-center justify-center ` +
        `shadow-lg ring-2 ring-white/10 text-white text-sm font-bold flex-shrink-0`
      }
    >
      {letter}
    </div>
  );
}

/* ── Main component ─────────────────────────────────────────────────────── */
export function SessionBar() {
  const [session, setCurrent]   = useState<Session | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const sync = () => setCurrent(getSession());
    sync();
    window.addEventListener('emr-session-change', sync);
    return () => window.removeEventListener('emr-session-change', sync);
  }, []);

  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      if (session?.refreshToken) {
        await apiFetch('/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refreshToken: session.refreshToken }),
        }).catch(() => null);
      }
    } finally {
      setSession(null);
      location.href = '/login';
    }
  }

  /* ── Logged-in state ─────────────────────────────────────────────────── */
  if (session) {
    const role       = getPrimaryRole(session.user.roles);
    const label      = ROLE_LABELS[role]  ?? role;
    const badgeCls   = ROLE_BADGE[role]   ?? 'badge badge-violet';
    const name       = session.user.fullName || session.user.email || 'Người dùng';

    return (
      <div className="flex items-center gap-2.5 animate-fade-in">
        {/* Gradient avatar */}
        <Avatar name={name} role={role} />

        {/* Name + role (desktop) */}
        <div className="hidden sm:flex flex-col min-w-0 max-w-[144px]">
          <span className="text-sm font-semibold text-white truncate leading-tight" title={name}>
            {name}
          </span>
          <span className={`${badgeCls} mt-0.5 w-fit text-[10px] px-2 py-0.5`}>
            {label}
          </span>
        </div>

        {/* Role badge (mobile only) */}
        <span className={`${badgeCls} sm:hidden text-[10px]`}>{label}</span>

        {/* Vertical divider */}
        <div className="h-5 w-px bg-white/10 mx-0.5 flex-shrink-0" />

        {/* Logout button */}
        <button
          onClick={logout}
          disabled={loggingOut}
          className="btn-secondary gap-1.5 px-3 py-2 text-xs"
          title="Đăng xuất"
        >
          {loggingOut ? (
            <>
              <span className="spinner-sm border-slate-400" />
              <span className="hidden sm:inline">Đang thoát…</span>
            </>
          ) : (
            <>
              <svg className="h-3.5 w-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24"
                stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M5.636 5.636a9 9 0 1012.728 0M12 3v9" />
              </svg>
              <span className="hidden sm:inline">Đăng xuất</span>
            </>
          )}
        </button>
      </div>
    );
  }

  /* ── Logged-out state ────────────────────────────────────────────────── */
  return (
    <div className="flex items-center gap-2 animate-fade-in">
      <Link href="/register" className="btn-secondary px-4 py-2 text-xs sm:text-sm">
        Đăng ký
      </Link>
      <Link href="/login" className="btn-primary px-4 py-2 text-xs sm:text-sm">
        Đăng nhập
      </Link>
    </div>
  );
}
