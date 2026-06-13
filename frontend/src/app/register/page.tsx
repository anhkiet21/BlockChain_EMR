'use client'

import { FormEvent, useState } from 'react'
import { publicApi, Session, setSession } from '@/lib/api/client'

export default function RegisterPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('password123')
  const [fullName, setFullName] = useState('')
  const [role, setRole]         = useState('PATIENT')
  const [message, setMessage]   = useState('')
  const [isError, setIsError]   = useState(false)
  const [busy, setBusy]         = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    setIsError(false)
    try {
      const session = await publicApi<Session>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, fullName, role }),
      })
      setSession(session)
      location.href = '/dashboard'
    } catch (error) {
      setIsError(true)
      setMessage(error instanceof Error ? error.message : 'Đăng ký thất bại')
    } finally {
      setBusy(false)
    }
  }

  const roleLabel = role === 'PATIENT' ? 'Bệnh nhân' : role === 'DOCTOR' ? 'Bác sĩ' : 'Cơ sở y tế'

  return (
    <section className="mx-auto max-w-md py-12 animate-fade-in">
      {/* ── Decorative glow ── */}
      <div className="pointer-events-none absolute left-1/2 top-24 -z-10 h-72 w-72 -translate-x-1/2 rounded-full bg-indigo-600/10 blur-3xl" />

      <form
        className="card-glass grid gap-5"
        onSubmit={submit}
        autoComplete="off"
      >
        {/* ── Header ── */}
        <div className="flex flex-col gap-1">
          <div className="mb-1 flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/30">
              <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            </div>
            <span className="label">Blockchain EMR</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Tạo tài khoản</h1>
          <p className="text-sm text-slate-400">
            Đăng ký với vai trò{' '}
            <span className="font-semibold text-indigo-400">Bệnh nhân</span>
            {' '}hoặc{' '}
            <span className="font-semibold text-emerald-400">Bác sĩ</span>
          </p>
        </div>

        <div className="divider" />

        {/* ── Email ── */}
        <div className="grid gap-1.5">
          <label className="form-label" htmlFor="reg-email">
            Email
          </label>
          <input
            id="reg-email"
            className="input"
            type="email"
            required
            placeholder="ban@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        {/* ── Mật khẩu ── */}
        <div className="grid gap-1.5">
          <label className="form-label" htmlFor="reg-password">
            Mật khẩu
          </label>
          <input
            id="reg-password"
            className="input"
            type="password"
            required
            minLength={8}
            placeholder="Tối thiểu 8 ký tự"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {/* ── Họ tên ── */}
        <div className="grid gap-1.5">
          <label className="form-label" htmlFor="reg-fullname">
            Họ tên
          </label>
          <input
            id="reg-fullname"
            className="input"
            type="text"
            required
            placeholder="Nguyễn Văn A"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>

        {/* ── Vai trò ── */}
        <div className="grid gap-2">
          <span className="form-label">Vai trò</span>
          <div className="grid grid-cols-3 gap-2">
            {(['PATIENT', 'DOCTOR', 'INSTITUTION'] as const).map((r) => {
              const isSelected = role === r
              const activeClass =
                r === 'PATIENT'
                  ? 'border-indigo-500/50 bg-indigo-500/15 text-indigo-300 shadow-lg shadow-indigo-500/10'
                  : r === 'DOCTOR'
                  ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300 shadow-lg shadow-emerald-500/10'
                  : 'border-teal-500/50 bg-teal-500/15 text-teal-300 shadow-lg shadow-teal-500/10'
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={[
                    'flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-xs font-semibold transition-all duration-200 justify-center',
                    isSelected
                      ? activeClass
                      : 'border-white/10 bg-white/5 text-slate-400 hover:border-white/20 hover:bg-white/10 hover:text-white',
                  ].join(' ')}
                >
                  <span className="text-lg leading-none">
                    {r === 'PATIENT' ? '👤' : r === 'DOCTOR' ? '🩺' : '🏥'}
                  </span>
                  <span>{r === 'PATIENT' ? 'Bệnh nhân' : r === 'DOCTOR' ? 'Bác sĩ' : 'Cơ sở y tế'}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Admin note ── */}
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
          <span className="mt-0.5 text-sm leading-none">⚠️</span>
          <p className="text-xs leading-relaxed text-amber-300/80">
            <span className="font-semibold text-amber-300">Tài khoản ADMIN</span>
            {' '}không thể tự đăng ký. Dùng tài khoản seed{' '}
            <code className="mono rounded bg-amber-500/10 px-1 py-0.5 text-amber-200">
              admin@test.local
            </code>
            .
          </p>
        </div>

        {/* ── Status message ── */}
        {message && (
          <p className={isError ? 'alert-error' : 'alert-success'}>
            {isError ? '✕ ' : '✓ '}
            {message}
          </p>
        )}

        {/* ── Submit button ── */}
        <button
          className="btn-primary w-full"
          type="submit"
          disabled={busy}
        >
          {busy ? (
            <>
              <span className="spinner-sm border-white/40 border-t-white" />
              Đang tạo...
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Tạo tài khoản {roleLabel}
            </>
          )}
        </button>

        {/* ── Back to login ── */}
        <p className="text-center text-sm text-slate-500">
          Đã có tài khoản?{' '}
          <a
            href="/login"
            className="font-semibold text-indigo-400 transition-colors hover:text-indigo-300"
          >
            Đăng nhập ngay
          </a>
        </p>
      </form>

      {/* ── Security note ── */}
      <p className="mt-4 text-center text-xs text-slate-600">
        🔒 Token chỉ được lưu trong sessionStorage và bị xoá khi đóng tab.
      </p>
    </section>
  )
}
