'use client';

import { useEffect, useState } from 'react';
import { apiFetch, getSession, setSession, User } from '@/lib/api/client';
import { connectWallet, shortAddress } from '@/lib/web3/provider';

/* ── Types ──────────────────────────────────────────────────────────────── */
type Status = 'idle' | 'connecting' | 'signing' | 'verifying' | 'success' | 'error';

/* ── Status message map ─────────────────────────────────────────────────── */
const STATUS_MESSAGES: Record<Status, string> = {
  idle:       '',
  connecting: 'Đang kết nối MetaMask…',
  signing:    'Vui lòng ký xác nhận trong MetaMask…',
  verifying:  'Đang xác minh chữ ký với máy chủ…',
  success:    'Ví đã được kết nối và xác minh thành công!',
  error:      '',
};

/* ── Shield / wallet icon ───────────────────────────────────────────────── */
function WalletIcon({ connected }: { connected: boolean }) {
  return (
    <div
      className={
        `relative h-14 w-14 rounded-2xl flex items-center justify-center flex-shrink-0 ` +
        `border shadow-lg transition-all duration-300 ` +
        (connected
          ? 'bg-emerald-500/15 border-emerald-500/30 shadow-emerald-500/10'
          : 'bg-indigo-500/15 border-indigo-500/30 shadow-indigo-500/10')
      }
    >
      {/* Glow blob */}
      <div
        className={
          `absolute inset-0 rounded-2xl blur-xl opacity-30 transition-all duration-300 ` +
          (connected ? 'bg-emerald-500' : 'bg-indigo-500')
        }
      />
      <svg
        className={`relative h-7 w-7 transition-colors duration-300 ${connected ? 'text-emerald-400' : 'text-indigo-400'}`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.8}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6
             9.749 9.749 0 003 11.999c0 5.592 3.824 10.29 9 11.623 5.176-1.332
             9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196
             0-6.1-1.248-8.25-3.285z"
        />
      </svg>
    </div>
  );
}

/* ── Step dots ──────────────────────────────────────────────────────────── */
function StepDots({ status }: { status: Status }) {
  const steps: Status[] = ['connecting', 'signing', 'verifying'];
  const activeIdx = steps.indexOf(status);
  if (activeIdx === -1 && status !== 'success') return null;

  return (
    <div className="flex items-center gap-2 mt-3">
      {steps.map((step, i) => (
        <div key={step} className="flex items-center gap-2">
          <div
            className={`h-1.5 w-6 rounded-full transition-all duration-500 ${
              status === 'success' || i < activeIdx
                ? 'bg-emerald-500'
                : i === activeIdx
                ? 'bg-indigo-500 animate-pulse'
                : 'bg-white/10'
            }`}
          />
        </div>
      ))}
    </div>
  );
}

/* ── Main component ─────────────────────────────────────────────────────── */
export function WalletCard({ onConnected }: { onConnected?: (address: string) => void }) {
  const [address, setAddress] = useState('');
  const [status,  setStatus]  = useState<Status>('idle');
  const [errMsg,  setErrMsg]  = useState('');

  /* Hydrate from session */
  useEffect(() => {
    const wallet = getSession()?.user.wallets[0];
    if (wallet) {
      setAddress(wallet);
      setStatus('success');
    }
  }, []);

  const busy      = status === 'connecting' || status === 'signing' || status === 'verifying';
  const connected = status === 'success' && !!address;

  async function connectAndVerify() {
    if (busy) return;
    setStatus('connecting');
    setErrMsg('');

    try {
      /* 1. Connect MetaMask */
      const { signer, address: wallet } = await connectWallet();
      setAddress(wallet);

      /* 2. Fetch nonce */
      setStatus('signing');
      const { message } = await apiFetch<{ message: string }>('/auth/wallet/nonce', {
        method: 'POST',
        body: JSON.stringify({ address: wallet }),
      });

      /* 3. Sign */
      const signature = await signer.signMessage(message);

      /* 4. Verify */
      setStatus('verifying');
      await apiFetch('/auth/wallet/verify', {
        method: 'POST',
        body: JSON.stringify({ address: wallet, signature }),
      });

      /* 5. Refresh user */
      const user    = await apiFetch<User>('/auth/me');
      const session = getSession();
      if (session) setSession({ ...session, user });

      setStatus('success');
      onConnected?.(wallet);
    } catch (err) {
      setStatus('error');
      setErrMsg(err instanceof Error ? err.message : 'Không thể kết nối ví. Vui lòng thử lại.');
    }
  }

  return (
    <div className="card-glass animate-fade-in">
      {/* Header row */}
      <div className="flex items-start gap-4">
        <WalletIcon connected={connected} />

        <div className="flex-1 min-w-0">
          {/* Title */}
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-bold text-white">Ví MetaMask</h3>
            {connected && (
              <span className="badge-emerald text-[10px] gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Đã xác minh
              </span>
            )}
            {status === 'error' && (
              <span className="badge-red text-[10px]">Lỗi kết nối</span>
            )}
          </div>

          {/* Address or placeholder */}
          {address ? (
            <div className="mt-1 flex items-center gap-2">
              {connected && (
                <span className="h-2 w-2 rounded-full bg-emerald-400 shadow shadow-emerald-400/50 animate-pulse flex-shrink-0" />
              )}
              <p className="mono text-sm font-semibold text-slate-200 tracking-wide">
                {shortAddress(address)}
              </p>
            </div>
          ) : (
            <p className="mt-1 text-sm text-slate-500 italic">Chưa kết nối ví</p>
          )}

          {/* Hint */}
          <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
            Cần MetaMask và mạng blockchain cục bộ (chain 31337) để thực hiện giao dịch.
          </p>
        </div>
      </div>

      {/* Step dots */}
      {busy && <StepDots status={status} />}

      {/* Status message */}
      {(busy || status === 'success') && STATUS_MESSAGES[status] && (
        <p
          className={`mt-3 text-xs font-medium transition-all duration-300 ${
            status === 'success' ? 'text-emerald-400' : 'text-indigo-400'
          }`}
        >
          {status !== 'success' && (
            <span className="inline-block h-3 w-3 rounded-full border-2 border-t-transparent border-indigo-400 animate-spin mr-2 align-middle" />
          )}
          {STATUS_MESSAGES[status]}
        </p>
      )}

      {/* Error message */}
      {status === 'error' && errMsg && (
        <div className="mt-3 alert-error text-xs">
          <strong>Lỗi:</strong> {errMsg}
        </div>
      )}

      {/* Divider */}
      <div className="divider" />

      {/* Action button */}
      <button
        className={`btn-secondary w-full gap-2 ${busy ? 'opacity-75' : ''}`}
        disabled={busy}
        onClick={connectAndVerify}
      >
        {busy ? (
          <>
            <span className="spinner-sm border-slate-400" />
            {STATUS_MESSAGES[status]}
          </>
        ) : connected ? (
          <>
            {/* Refresh icon */}
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993
                   0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25
                   0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            Kết nối lại MetaMask
          </>
        ) : (
          <>
            {/* Plug / link icon */}
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5
                   0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5
                   4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
            </svg>
            Kết nối &amp; Xác minh MetaMask
          </>
        )}
      </button>
    </div>
  );
}
