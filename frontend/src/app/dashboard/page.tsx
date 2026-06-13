'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { getSession, Session } from '@/lib/api/client'

// ── Card configuration ────────────────────────────────────────────────────────
type CardColor =
  | 'indigo' | 'violet' | 'purple' | 'amber'
  | 'emerald' | 'red' | 'teal' | 'cyan' | 'slate'

interface NavCard {
  role: string
  href: string
  icon: string
  title: string
  desc: string
  color: CardColor
}

const CARDS: NavCard[] = [
  {
    role: 'PATIENT',
    href: '/patient/access',
    icon: '🔐',
    title: 'Quản lý quyền truy cập',
    desc: 'Cấp/hủy quyền bác sĩ bằng MetaMask và xem lịch sử.',
    color: 'indigo',
  },
  {
    role: 'PATIENT',
    href: '/patient/files',
    icon: '📁',
    title: 'File bệnh án của tôi',
    desc: 'Upload file, xem danh sách và tải xuống file đã mã hoá.',
    color: 'violet',
  },
  {
    role: 'PATIENT',
    href: '/patient/history',
    icon: '📋',
    title: 'Lịch sử bệnh án',
    desc: 'Xem toàn bộ lịch sử truy cập hồ sơ — ai xem, tải, chỉnh sửa.',
    color: 'purple',
  },
  {
    role: 'PATIENT',
    href: '/patient/requests',
    icon: '🔔',
    title: 'Yêu cầu truy cập',
    desc: 'Xem và phê duyệt/từ chối yêu cầu xem bệnh án từ bác sĩ.',
    color: 'amber',
  },
  {
    role: 'DOCTOR',
    href: '/doctor/records',
    icon: '🩺',
    title: 'Quản lý bệnh án',
    desc: 'Tìm bệnh nhân, tải lên IPFS, tạo bệnh án và tải file.',
    color: 'emerald',
  },
  {
    role: 'ADMIN',
    href: '/admin',
    icon: '⚙️',
    title: 'Quản trị hệ thống',
    desc: 'Quản lý khoa phòng, xác minh bác sĩ và đồng bộ blockchain.',
    color: 'red',
  },
  {
    role: 'INSTITUTION',
    href: '/institution',
    icon: '🏥',
    title: 'Quản lý cơ sở y tế',
    desc: 'Cập nhật thông tin cơ sở và duyệt/từ chối bác sĩ liên kết.',
    color: 'teal',
  },
  {
    role: 'ALL',
    href: '/profile',
    icon: '👤',
    title: 'Hồ sơ cá nhân',
    desc: 'Cập nhật thông tin và liên kết ví MetaMask.',
    color: 'cyan',
  },
  {
    role: 'ALL',
    href: '/blockchain',
    icon: '⛓️',
    title: 'Công cụ Blockchain',
    desc: 'Kiểm tra quyền, giao dịch và record on-chain.',
    color: 'slate',
  },
]

// ── Color map ─────────────────────────────────────────────────────────────────
const COLOR_MAP: Record<CardColor, { circle: string; border: string; glow: string }> = {
  indigo:  { circle: 'bg-indigo-500/20  text-indigo-400',  border: 'hover:border-indigo-500/30  hover:shadow-indigo-500/5',  glow: 'group-hover:bg-indigo-500/10'  },
  violet:  { circle: 'bg-violet-500/20  text-violet-400',  border: 'hover:border-violet-500/30  hover:shadow-violet-500/5',  glow: 'group-hover:bg-violet-500/10'  },
  purple:  { circle: 'bg-purple-500/20  text-purple-400',  border: 'hover:border-purple-500/30  hover:shadow-purple-500/5',  glow: 'group-hover:bg-purple-500/10'  },
  amber:   { circle: 'bg-amber-500/20   text-amber-400',   border: 'hover:border-amber-500/30   hover:shadow-amber-500/5',   glow: 'group-hover:bg-amber-500/10'   },
  emerald: { circle: 'bg-emerald-500/20 text-emerald-400', border: 'hover:border-emerald-500/30 hover:shadow-emerald-500/5', glow: 'group-hover:bg-emerald-500/10' },
  red:     { circle: 'bg-red-500/20     text-red-400',     border: 'hover:border-red-500/30     hover:shadow-red-500/5',     glow: 'group-hover:bg-red-500/10'     },
  teal:    { circle: 'bg-teal-500/20    text-teal-400',    border: 'hover:border-teal-500/30    hover:shadow-teal-500/5',    glow: 'group-hover:bg-teal-500/10'    },
  cyan:    { circle: 'bg-cyan-500/20    text-cyan-400',    border: 'hover:border-cyan-500/30    hover:shadow-cyan-500/5',    glow: 'group-hover:bg-cyan-500/10'    },
  slate:   { circle: 'bg-slate-500/20   text-slate-400',   border: 'hover:border-slate-500/30   hover:shadow-slate-500/5',   glow: 'group-hover:bg-slate-500/10'   },
}

// ── Role badge config ─────────────────────────────────────────────────────────
const ROLE_BADGE: Record<string, { label: string; cls: string }> = {
  PATIENT:     { label: 'Bệnh nhân',    cls: 'badge-indigo'  },
  DOCTOR:      { label: 'Bác sĩ',       cls: 'badge-emerald' },
  ADMIN:       { label: 'Quản trị',     cls: 'badge-red'     },
  INSTITUTION: { label: 'Cơ sở y tế',  cls: 'badge-violet'  },
}

// ── Stagger delay helper ──────────────────────────────────────────────────────
const STAGGER = ['', 'stagger-1', 'stagger-2', 'stagger-3', 'stagger-4']

// ─────────────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [session, setSessionState] = useState<Session | null>(null)
  const [loaded, setLoaded]        = useState(false)

  useEffect(() => {
    setSessionState(getSession())
    setLoaded(true)
  }, [])

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (!loaded) {
    return (
      <section className="grid gap-6">
        <div className="h-10 w-64 animate-pulse rounded-xl bg-white/5" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-white/5" />
          ))}
        </div>
      </section>
    )
  }

  // ── Not logged in ─────────────────────────────────────────────────────────
  if (!session) {
    return (
      <section className="flex min-h-[60vh] items-center justify-center animate-fade-in">
        <div className="card-glass max-w-sm w-full text-center grid gap-5">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-700 to-slate-800 text-3xl shadow-xl">
            🔒
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Bạn chưa đăng nhập</h1>
            <p className="mt-2 text-sm text-slate-400">
              Vui lòng đăng nhập để truy cập hệ thống hồ sơ bệnh án điện tử.
            </p>
          </div>
          <div className="grid gap-2">
            <Link className="btn-primary" href="/login">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
              </svg>
              Đăng nhập ngay
            </Link>
            <Link className="btn-secondary" href="/register">
              Tạo tài khoản mới
            </Link>
          </div>
        </div>
      </section>
    )
  }

  const roles   = session.user.roles
  const visible = CARDS.filter((c) => c.role === 'ALL' || roles.includes(c.role))

  // ── Dashboard ─────────────────────────────────────────────────────────────
  return (
    <section className="grid gap-8 animate-fade-in">

      {/* ── Page header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="grid gap-2">
          <p className="label">Bảng điều khiển</p>
          <h1 className="page-title">
            Xin chào,{' '}
            <span className="gradient-text">{session.user.fullName}</span>
            {' '}👋
          </h1>
          {/* Role badges */}
          <div className="flex flex-wrap gap-2 mt-1">
            {roles.map((r) => {
              const cfg = ROLE_BADGE[r]
              return cfg ? (
                <span key={r} className={cfg.cls}>
                  {cfg.label}
                </span>
              ) : (
                <span key={r} className="badge badge-slate">{r}</span>
              )
            })}
          </div>
        </div>

        {/* Quick stats */}
        <div className="flex shrink-0 gap-3">
          <div className="card text-center px-5 py-4 min-w-[90px]">
            <p className="text-2xl font-bold text-white">{visible.length}</p>
            <p className="text-xs text-slate-500 mt-0.5">Mô-đun</p>
          </div>
          <div className="card text-center px-5 py-4 min-w-[90px]">
            <p className="text-2xl font-bold text-white">{roles.length}</p>
            <p className="text-xs text-slate-500 mt-0.5">Vai trò</p>
          </div>
        </div>
      </div>

      {/* ── Stats bar ── */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-6 py-4 flex flex-wrap gap-6">
        <div className="flex items-center gap-3">
          <div className="h-2 w-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
          <span className="text-sm text-slate-400">
            Hệ thống <span className="font-semibold text-emerald-400">hoạt động</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-2 w-2 rounded-full bg-indigo-400" />
          <span className="text-sm text-slate-400">
            <span className="font-semibold text-white">{visible.length}</span> mô-đun có thể truy cập
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-2 w-2 rounded-full bg-violet-400" />
          <span className="text-sm text-slate-400">
            Ví:{' '}
            <span className="font-semibold text-white">
              {session.user.wallets?.length
                ? `${session.user.wallets.length} đã liên kết`
                : 'Chưa liên kết'}
            </span>
          </span>
        </div>
      </div>

      {/* ── Module cards grid ── */}
      <div>
        <h2 className="section-title mb-4">Mô-đun chức năng</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((card, idx) => {
            const c = COLOR_MAP[card.color]
            return (
              <Link
                key={card.href}
                href={card.href}
                className={[
                  'group card-hover flex flex-col gap-4 transition-all duration-200',
                  'hover:shadow-xl',
                  c.border,
                  'animate-fade-in',
                  STAGGER[idx % 5] ?? '',
                ].join(' ')}
              >
                {/* Icon row */}
                <div className="flex items-start justify-between">
                  <div
                    className={[
                      'flex h-11 w-11 items-center justify-center rounded-xl text-xl',
                      'transition-all duration-200 group-hover:scale-110',
                      c.circle,
                    ].join(' ')}
                  >
                    {card.icon}
                  </div>
                  {/* Arrow */}
                  <svg
                    className="h-4 w-4 text-slate-600 transition-all duration-200 group-hover:text-slate-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                  </svg>
                </div>

                {/* Text */}
                <div className="grid gap-1.5">
                  <h3 className="font-semibold text-white leading-snug group-hover:text-white transition-colors">
                    {card.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-slate-500 group-hover:text-slate-400 transition-colors">
                    {card.desc}
                  </p>
                </div>

                {/* Bottom gradient accent */}
                <div
                  className={[
                    'absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-200 group-hover:opacity-100 -z-10',
                    c.glow,
                  ].join(' ')}
                />
              </Link>
            )
          })}
        </div>
      </div>

      {/* ── Bottom tip ── */}
      <p className="text-center text-xs text-slate-700 pb-4">
        ⛓️ Blockchain EMR — Dữ liệu y tế được bảo mật và bất biến trên blockchain.
      </p>
    </section>
  )
}
