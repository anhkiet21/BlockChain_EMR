'use client';

import { FormEvent, useEffect, useState } from 'react';
import { WalletCard } from '@/components/wallet-card';
import { AccessState } from '@/components/access-state';
import { apiFetch, getSession } from '@/lib/api/client';
import { AccessHistory, Page, PreparedAccessTransaction } from '@/lib/api/types';
import { useRequiredRole } from '@/lib/auth/use-required-role';
import { sendPreparedTransaction, shortAddress } from '@/lib/web3/provider';

type AlertKind = 'success' | 'error' | 'info';
type Alert = { text: string; kind: AlertKind };

function stepMessage(text: string): Alert {
  return { text, kind: 'info' };
}

export default function PatientAccessPage() {
  const access = useRequiredRole('PATIENT');
  const [patientWallet, setPatientWallet] = useState('');
  const [doctorWallet, setDoctorWallet] = useState('');
  const [doctorProfileId, setDoctorProfileId] = useState('');
  const [history, setHistory] = useState<AccessHistory[]>([]);
  const [alert, setAlert] = useState<Alert | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    const wallet = getSession()?.user.wallets[0];
    if (wallet) setPatientWallet(wallet);
    loadHistory();
  }, []);

  async function loadHistory() {
    setLoadingHistory(true);
    try {
      const page = await apiFetch<Page<AccessHistory>>('/access-control/history?size=50');
      setHistory(page.content);
    } catch (error) {
      setAlert({ text: error instanceof Error ? error.message : 'Không thể tải lịch sử', kind: 'error' });
    } finally {
      setLoadingHistory(false);
    }
  }

  async function updateAccess(event: FormEvent | null, granted: boolean) {
    if (event) event.preventDefault();
    if (!doctorProfileId) {
      setAlert({ text: 'Vui lòng nhập ID hồ sơ bác sĩ.', kind: 'error' });
      return;
    }
    if (!doctorWallet || !patientWallet) {
      setAlert({ text: 'Vui lòng nhập đầy đủ địa chỉ ví bác sĩ và bệnh nhân.', kind: 'error' });
      return;
    }
    setBusy(true);
    setAlert(stepMessage('⏳ Đang chuẩn bị dữ liệu giao dịch từ backend...'));
    try {
      const request = {
        doctorProfileId: Number(doctorProfileId),
        patientWallet,
        doctorWallet,
        granted,
      };
      const prepared = await apiFetch<PreparedAccessTransaction>(
        '/access-control/transactions/prepare',
        { method: 'POST', body: JSON.stringify(request) },
      );
      setAlert(stepMessage('🦊 Hãy xác nhận giao dịch trong MetaMask...'));
      const receipt = await sendPreparedTransaction(prepared);
      setAlert(stepMessage('⛓️ Giao dịch đã được mine. Backend đang xác minh on-chain...'));
      await apiFetch('/access-control/transactions/verify', {
        method: 'POST',
        body: JSON.stringify({ ...request, transactionHash: receipt.hash }),
      });
      setAlert({
        text: granted
          ? `✅ Đã cấp quyền thành công. TX: ${shortAddress(receipt.hash)}`
          : `✅ Đã hủy quyền thành công. TX: ${shortAddress(receipt.hash)}`,
        kind: 'success',
      });
      await loadHistory();
    } catch (error) {
      setAlert({
        text: error instanceof Error ? error.message : 'Không thể cập nhật quyền',
        kind: 'error',
      });
    } finally {
      setBusy(false);
    }
  }

  if (access !== 'allowed') return <AccessState access={access} />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-violet-950 p-4 md:p-8">
      <div className="max-w-5xl mx-auto grid gap-8">

        {/* ── Page Header ─────────────────────────────────────────────────── */}
        <div className="animate-fade-in">
          <div className="role-pill border-violet-500/20 bg-violet-500/10 text-violet-400">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-pulse" />
            Không gian bệnh nhân
          </div>
          <h1 className="page-title mt-2">🔐 Quản lý quyền truy cập</h1>
          <p className="page-subtitle">
            Mọi thay đổi quyền đều do ví bệnh nhân ký và được backend xác minh on-chain.
          </p>
        </div>

        {/* ── Wallet Card ──────────────────────────────────────────────────── */}
        <div className="animate-fade-in stagger-1">
          <WalletCard onConnected={setPatientWallet} />
        </div>

        {/* ── Prerequisite Checklist ───────────────────────────────────────── */}
        <div className="animate-fade-in stagger-2 rounded-2xl border border-amber-500/20 bg-amber-500/5 px-5 py-4">
          <p className="text-amber-400 font-semibold text-sm mb-3 flex items-center gap-2">
            <span>⚠️</span> Điều kiện cần trước khi cấp quyền
          </p>
          <ul className="grid gap-2 text-sm">
            {[
              { icon: "1️⃣", text: "Bệnh nhân đã liên kết ví MetaMask vào tài khoản (Hồ sơ cá nhân → Liên kết ví)" },
              { icon: "2️⃣", text: "Bác sĩ đã liên kết ví MetaMask vào tài khoản của họ" },
              { icon: "3️⃣", text: "Bác sĩ đã được Admin xác minh (verified = true)" },
              { icon: "4️⃣", text: "MetaMask đang dùng đúng ví bệnh nhân đã liên kết ở trên" },
            ].map((item) => (
              <li key={item.icon} className="flex items-start gap-2.5 text-slate-400">
                <span className="shrink-0 text-base leading-5">{item.icon}</span>
                <span>{item.text}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-amber-600">
            Nếu gặp lỗi "Bạn không có quyền truy cập tài nguyên", hãy kiểm tra lại 4 điều kiện trên.
            Thông báo lỗi từ backend sẽ chỉ rõ điều kiện nào chưa thỏa.
          </p>
        </div>

        {/* ── Alert Banner ─────────────────────────────────────────────────── */}
        {alert && (
          <div
            className={`animate-fade-in flex items-start gap-3 px-5 py-4 rounded-2xl text-sm ${
              alert.kind === 'success'
                ? 'alert-success'
                : alert.kind === 'error'
                ? 'alert-error'
                : 'status'
            }`}
          >
            <span className="flex-1">{alert.text}</span>
            {!busy && (
              <button
                type="button"
                onClick={() => setAlert(null)}
                className="opacity-60 hover:opacity-100 transition-opacity text-lg leading-none"
              >
                ×
              </button>
            )}
          </div>
        )}

        {/* ── Grant / Revoke Form ──────────────────────────────────────────── */}
        <form
          className="card grid gap-6 animate-fade-in stagger-2"
          onSubmit={(e) => updateAccess(e, true)}
        >
          <div className="flex items-center gap-3 pb-4 border-b border-white/10">
            <div className="h-10 w-10 rounded-xl bg-violet-500/20 flex items-center justify-center text-xl">
              🔑
            </div>
            <div>
              <h2 className="section-title">Cấp hoặc hủy quyền bác sĩ</h2>
              <p className="text-slate-500 text-xs mt-0.5">
                Giao dịch sẽ được ký bởi ví bệnh nhân qua MetaMask
              </p>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {/* Doctor profile ID */}
            <div>
              <label className="form-label">ID hồ sơ bác sĩ</label>
              <input
                className="input"
                type="number"
                min="1"
                required
                placeholder="VD: 1"
                value={doctorProfileId}
                onChange={(e) => setDoctorProfileId(e.target.value)}
              />
            </div>

            {/* Doctor wallet */}
            <div>
              <label className="form-label">Ví bác sĩ</label>
              <input
                className="input font-mono text-xs"
                required
                pattern="^0x[0-9a-fA-F]{40}$"
                placeholder="0x..."
                value={doctorWallet}
                onChange={(e) => setDoctorWallet(e.target.value)}
              />
            </div>

            {/* Patient wallet */}
            <div>
              <label className="form-label">Ví bệnh nhân</label>
              <input
                className="input font-mono text-xs"
                required
                pattern="^0x[0-9a-fA-F]{40}$"
                placeholder="0x..."
                value={patientWallet}
                onChange={(e) => setPatientWallet(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-2 border-t border-white/10">
            <button
              type="submit"
              className="btn-success"
              disabled={busy}
            >
              {busy ? (
                <>
                  <span className="spinner-sm border-white/40 border-t-white" />
                  Đang xử lý...
                </>
              ) : (
                <>
                  <span>✅</span>
                  Cấp quyền
                </>
              )}
            </button>
            <button
              type="button"
              className="btn-danger"
              disabled={busy}
              onClick={() => updateAccess(null, false)}
            >
              {busy ? (
                <>
                  <span className="spinner-sm border-white/40 border-t-white" />
                  Đang xử lý...
                </>
              ) : (
                <>
                  <span>🚫</span>
                  Hủy quyền
                </>
              )}
            </button>
          </div>
        </form>

        {/* ── Access History ───────────────────────────────────────────────── */}
        <div className="card animate-fade-in stagger-3">
          <div className="flex items-center justify-between gap-4 pb-4 border-b border-white/10 mb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-xl">
                📋
              </div>
              <div>
                <h2 className="section-title">Lịch sử quyền truy cập</h2>
                <p className="text-slate-500 text-xs mt-0.5">
                  {history.length > 0 ? `${history.length} bản ghi gần nhất` : 'Chưa có dữ liệu'}
                </p>
              </div>
            </div>
            <button
              className="btn-secondary"
              onClick={loadHistory}
              disabled={loadingHistory}
            >
              {loadingHistory ? (
                <>
                  <span className="spinner-sm border-white/40 border-t-white" />
                  Đang tải...
                </>
              ) : (
                '↻ Làm mới'
              )}
            </button>
          </div>

          {loadingHistory ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4 text-slate-400">
              <div className="h-9 w-9 rounded-full border-2 border-violet-400 border-t-transparent animate-spin" />
              <p className="text-sm">Đang tải lịch sử...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="empty-state">
              <div className="text-5xl">📭</div>
              <p className="text-slate-400 font-medium">Chưa có lịch sử quyền truy cập</p>
              <p className="text-slate-600 text-sm">
                Các giao dịch cấp/hủy quyền sẽ xuất hiện ở đây sau khi được ghi lên blockchain.
              </p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Bác sĩ</th>
                    <th>Trạng thái</th>
                    <th>Transaction Hash</th>
                    <th>Thời gian</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((item) => (
                    <tr key={item.id} className="group">
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
                            {item.doctorName?.charAt(0) ?? 'B'}
                          </div>
                          <div>
                            <p className="text-white font-semibold text-sm">{item.doctorName}</p>
                            <p className="text-slate-500 text-xs font-mono">
                              {item.doctorCode} · ID {item.doctorProfileId}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td>
                        {item.granted ? (
                          <span className="badge badge-emerald">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                            Đã cấp
                          </span>
                        ) : (
                          <span className="badge badge-red">
                            <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                            Đã hủy
                          </span>
                        )}
                      </td>
                      <td>
                        <span
                          className="font-mono text-xs text-slate-400 bg-white/5 rounded-lg px-2.5 py-1.5 border border-white/10"
                          title={item.transactionHash}
                        >
                          {shortAddress(item.transactionHash)}
                        </span>
                      </td>
                      <td className="text-slate-400 text-sm">
                        {new Date(item.occurredAt).toLocaleString('vi-VN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
