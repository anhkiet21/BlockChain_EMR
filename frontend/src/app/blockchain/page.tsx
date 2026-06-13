'use client'

import { FormEvent, useState } from 'react'
import { ResponseBox } from '@/components/response-box'
import { apiFetch, getSession } from '@/lib/api/client'
import { AccessCheck, OnChainRecord, TransactionState } from '@/lib/api/types'

/* ─────────────────────────────────────────────
   Shared: field label
───────────────────────────────────────────── */
function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="block text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1.5">
      {children}
    </span>
  )
}

/* ─────────────────────────────────────────────
   Shared: card section header
───────────────────────────────────────────── */
function CardHeader({ icon, title, subtitle }: { icon: string; title: string; subtitle?: string }) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-3 mb-1">
        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/20 flex items-center justify-center text-lg shrink-0">
          {icon}
        </div>
        <h2 className="text-base font-bold text-white">{title}</h2>
      </div>
      {subtitle && <p className="text-xs text-slate-500 ml-12 leading-relaxed">{subtitle}</p>}
    </div>
  )
}

/* ─────────────────────────────────────────────
   Shared: spinner
───────────────────────────────────────────── */
function Spinner({ color = 'border-indigo-400' }: { color?: string }) {
  return (
    <span className={`inline-block h-4 w-4 rounded-full border-2 border-t-transparent animate-spin ${color}`} />
  )
}

/* ─────────────────────────────────────────────
   Shared: mono text input
───────────────────────────────────────────── */
function MonoInput({
  placeholder,
  value,
  onChange,
  required,
  type = 'text',
  min,
  disabled,
}: {
  placeholder: string
  value: string
  onChange: (v: string) => void
  required?: boolean
  type?: string
  min?: string
  disabled?: boolean
}) {
  return (
    <input
      className="input font-mono text-xs tracking-tight"
      style={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={required}
      type={type}
      min={min}
      disabled={disabled}
    />
  )
}

/* ─────────────────────────────────────────────
   Main Page
───────────────────────────────────────────── */
export default function BlockchainPage() {
  /* ── Access check state ── */
  const [patientWallet, setPatientWallet] = useState('')
  const [granteeWallet, setGranteeWallet] = useState('')
  const [accessResult, setAccessResult] = useState<AccessCheck | null>(null)
  const [accessBusy, setAccessBusy] = useState(false)

  /* ── On-chain record state ── */
  const [recordId, setRecordId] = useState('')
  const [callerWallet, setCallerWallet] = useState('')
  const [recordBusy, setRecordBusy] = useState(false)

  /* ── Transaction state ── */
  const [txHash, setTxHash] = useState('')
  const [txBusy, setTxBusy] = useState(false)
  const [syncBusy, setSyncBusy] = useState(false)

  /* ── Global message & response ── */
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null)
  const [response, setResponse] = useState<unknown>(null)

  /* ── Admin check (client-side, for sync button) ── */
  const isAdmin =
    typeof window !== 'undefined' ? getSession()?.user.roles.includes('ADMIN') ?? false : false

  function showMessage(text: string, type: 'success' | 'error' | 'info' = 'info') {
    setMessage({ text, type })
  }

  /* ── Check access on-chain ── */
  async function handleCheckAccess(e: FormEvent) {
    e.preventDefault()
    setAccessBusy(true)
    setAccessResult(null)
    setMessage(null)
    try {
      const data = await apiFetch<AccessCheck>(
        `/blockchain/access?patientWallet=${encodeURIComponent(patientWallet)}&granteeWallet=${encodeURIComponent(granteeWallet)}`
      )
      setAccessResult(data)
      setResponse(data)
      showMessage(
        data.granted
          ? 'On-chain: bac si da duoc cap quyen truy cap.'
          : 'On-chain: bac si chua co quyen truy cap.',
        data.granted ? 'success' : 'error'
      )
    } catch (err) {
      showMessage(err instanceof Error ? err.message : 'Khong the kiem tra quyen truy cap', 'error')
    } finally {
      setAccessBusy(false)
    }
  }

  /* ── Read on-chain record ── */
  async function handleGetRecord(e: FormEvent) {
    e.preventDefault()
    setRecordBusy(true)
    setMessage(null)
    try {
      const data = await apiFetch<OnChainRecord>(
        `/blockchain/records/${recordId}?callerWallet=${encodeURIComponent(callerWallet)}`
      )
      setResponse(data)
      showMessage(
        data.exists
          ? `Da tai record on-chain ID ${data.recordId}.`
          : `Record ID ${recordId} khong ton tai tren chain.`,
        data.exists ? 'success' : 'error'
      )
    } catch (err) {
      showMessage(err instanceof Error ? err.message : 'Khong the doc record on-chain', 'error')
    } finally {
      setRecordBusy(false)
    }
  }

  /* ── Get transaction status ── */
  async function handleGetTransaction(e: FormEvent) {
    e.preventDefault()
    setTxBusy(true)
    setMessage(null)
    try {
      const data = await apiFetch<TransactionState>(`/blockchain/transactions/${txHash}`)
      setResponse(data)
      showMessage(
        data.found
          ? data.success
            ? `Giao dich thanh cong - Block ${data.blockNumber ?? '?'}.`
            : 'Giao dich that bai hoac dang cho xu ly.'
          : 'Khong tim thay giao dich voi hash nay.',
        data.found && data.success ? 'success' : 'error'
      )
    } catch (err) {
      showMessage(err instanceof Error ? err.message : 'Khong the kiem tra giao dich', 'error')
    } finally {
      setTxBusy(false)
    }
  }

  /* ── Sync blockchain events (admin only) ── */
  async function handleSyncEvents() {
    setSyncBusy(true)
    setMessage(null)
    try {
      const data = await apiFetch('/blockchain/events/sync', { method: 'POST' })
      setResponse(data)
      showMessage('Da dong bo blockchain events thanh cong.', 'success')
    } catch (err) {
      showMessage(err instanceof Error ? err.message : 'Khong the dong bo events', 'error')
    } finally {
      setSyncBusy(false)
    }
  }

  /* ── Alert color helper ── */
  const alertClass =
    message?.type === 'success'
      ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300'
      : message?.type === 'error'
      ? 'bg-red-500/10 border-red-500/25 text-red-300'
      : 'bg-indigo-500/10 border-indigo-500/25 text-indigo-300'

  return (
    <div className="animate-fade-in space-y-8">

      {/* ── Page Header ── */}
      <div className="relative overflow-hidden rounded-2xl border border-indigo-500/15 bg-gradient-to-r from-indigo-950/70 via-violet-950/40 to-slate-900/60 backdrop-blur-md p-6 shadow-2xl">
        {/* Decorative glows */}
        <div className="pointer-events-none absolute -right-24 -top-16 h-72 w-72 rounded-full bg-violet-600/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-8 bottom-0 h-56 w-56 rounded-full bg-indigo-600/8 blur-3xl" />

        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            {/* Badge */}
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-500/15 border border-indigo-500/25 px-3.5 py-1 mb-3">
              <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-pulse" />
              <span className="text-xs font-semibold text-indigo-300 uppercase tracking-widest">
                On-chain Query
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
              Cong cu{' '}
              <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
                Blockchain
              </span>
            </h1>
            <p className="mt-2 text-slate-400 text-sm leading-relaxed">
              Kiem tra quyen truy cap, doc ban ghi on-chain va theo doi trang thai giao dich tu smart contract.
            </p>
          </div>

          {/* Chain badge */}
          <div className="shrink-0 flex flex-col gap-2">
            <div className="rounded-xl bg-white/5 border border-indigo-500/15 px-4 py-3 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <div className="h-2 w-2 rounded-full bg-violet-400 animate-pulse" />
                <span className="text-xs font-semibold text-violet-300">Blockchain EMR</span>
              </div>
              <p className="text-xs text-slate-500">Smart Contract Interface</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Global alert banner ── */}
      {message && (
        <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm animate-fade-in ${alertClass}`}>
          <span className="shrink-0 mt-0.5">
            {message.type === 'success' ? '\u2705' : message.type === 'error' ? '\u26a0\ufe0f' : '\u2139\ufe0f'}
          </span>
          <span className="leading-relaxed">{message.text}</span>
          <button
            type="button"
            onClick={() => setMessage(null)}
            className="ml-auto shrink-0 opacity-60 hover:opacity-100 transition-opacity text-base leading-none"
          >
            x
          </button>
        </div>
      )}

      {/* ── Three-column card grid ── */}
      <div className="grid gap-6 lg:grid-cols-3">

        {/* ── Card 1: Kiem tra quyen truy cap ── */}
        <form
          onSubmit={handleCheckAccess}
          className="card-glass space-y-4 animate-fade-in stagger-1"
        >
          <CardHeader
            icon="\U0001f512"
            title="Kiem tra quyen truy cap"
            subtitle="Xac minh quyen bac si tren smart contract"
          />

          <div className="space-y-3">
            <div>
              <FieldLabel>Vi benh nhan</FieldLabel>
              <MonoInput
                placeholder="0x..."
                value={patientWallet}
                onChange={setPatientWallet}
                required
              />
            </div>
            <div>
              <FieldLabel>Vi bac si / nguoi duoc cap</FieldLabel>
              <MonoInput
                placeholder="0x..."
                value={granteeWallet}
                onChange={setGranteeWallet}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={accessBusy}
            className="btn-primary w-full"
          >
            {accessBusy && <Spinner color="border-white" />}
            {accessBusy ? 'Dang kiem tra...' : 'Kiem tra'}
          </button>

          {/* Inline access result badge */}
          {accessResult !== null && (
            <div
              className={`flex items-center gap-2.5 rounded-xl px-4 py-3 border text-sm font-semibold animate-scale-in ${
                accessResult.granted
                  ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300'
                  : 'bg-red-500/10 border-red-500/25 text-red-300'
              }`}
            >
              <span className="text-lg">{accessResult.granted ? '\u2705' : '\u274c'}</span>
              <span>
                {accessResult.granted ? 'Da duoc cap quyen' : 'Chua co quyen'}
              </span>
            </div>
          )}
        </form>

        {/* ── Card 2: Doc ban ghi on-chain ── */}
        <form
          onSubmit={handleGetRecord}
          className="card-glass space-y-4 animate-fade-in stagger-2"
        >
          <CardHeader
            icon="\U0001f4dc"
            title="Doc ban ghi on-chain"
            subtitle="Lay thong tin ban ghi tu smart contract"
          />

          <div className="space-y-3">
            <div>
              <FieldLabel>On-chain Record ID</FieldLabel>
              <input
                className="input"
                type="number"
                min="0"
                placeholder="Vi du: 1, 42, 100..."
                value={recordId}
                onChange={(e) => setRecordId(e.target.value)}
                required
              />
            </div>
            <div>
              <FieldLabel>Vi caller</FieldLabel>
              <MonoInput
                placeholder="0x..."
                value={callerWallet}
                onChange={setCallerWallet}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={recordBusy}
            className="btn-primary w-full"
          >
            {recordBusy && <Spinner color="border-white" />}
            {recordBusy ? 'Dang doc...' : 'Doc record'}
          </button>

          {/* Info note */}
          <div className="rounded-xl bg-white/3 border border-white/5 px-3 py-2.5">
            <p className="text-xs text-slate-600 leading-relaxed">
              Caller wallet phai co quyen truy cap ho so benh nhan moi co the doc duoc ban ghi.
            </p>
          </div>
        </form>

        {/* ── Card 3: Trang thai giao dich ── */}
        <form
          onSubmit={handleGetTransaction}
          className="card-glass space-y-4 animate-fade-in stagger-3"
        >
          <CardHeader
            icon="\U0001f9fe"
            title="Trang thai giao dich"
            subtitle="Theo doi ket qua giao dich tren chain"
          />

          <div>
            <FieldLabel>Transaction Hash</FieldLabel>
            <MonoInput
              placeholder="0x..."
              value={txHash}
              onChange={setTxHash}
              required
            />
          </div>

          <div className="flex flex-col gap-2.5">
            <button
              type="submit"
              disabled={txBusy || syncBusy}
              className="btn-primary w-full"
            >
              {txBusy && <Spinner color="border-white" />}
              {txBusy ? 'Dang kiem tra...' : 'Kiem tra TX'}
            </button>

            {/* Admin-only sync button */}
            {isAdmin && (
              <button
                type="button"
                disabled={syncBusy || txBusy}
                onClick={handleSyncEvents}
                className="btn-secondary w-full"
              >
                {syncBusy && <Spinner />}
                {syncBusy ? 'Dang dong bo...' : 'Dong bo events'}
              </button>
            )}
          </div>

          {/* TX hash format hint */}
          <div className="rounded-xl bg-violet-500/5 border border-violet-500/10 px-3 py-2.5">
            <p className="text-xs text-violet-400/70 font-medium mb-0.5">Dinh dang hop le</p>
            <p className="text-xs text-slate-600 font-mono">0x + 64 ky tu hex</p>
          </div>

          {/* Admin badge if applicable */}
          {isAdmin && (
            <div className="flex items-center gap-2 rounded-xl bg-orange-500/5 border border-orange-500/10 px-3 py-2.5">
              <span className="text-xs text-orange-400 font-semibold">ADMIN</span>
              <span className="text-xs text-slate-500">Nut dong bo hien thi chi voi Admin</span>
            </div>
          )}
        </form>
      </div>

      {/* ── API Response Box ── */}
      {response !== null && (
        <div className="animate-fade-in">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-violet-400 animate-pulse" />
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                Phan hoi Blockchain
              </span>
            </div>
            <button
              type="button"
              onClick={() => setResponse(null)}
              className="text-xs text-slate-600 hover:text-slate-400 transition-colors px-2 py-1 rounded hover:bg-white/5"
            >
              Xoa
            </button>
          </div>
          <ResponseBox title="Du lieu on-chain" data={response} />
        </div>
      )}
    </div>
  )
}
