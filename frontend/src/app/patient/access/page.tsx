"use client";

import { FormEvent, useEffect, useState } from "react";
import { WalletCard } from "@/components/wallet-card";
import { AccessState } from "@/components/access-state";
import { apiFetch, getSession } from "@/lib/api/client";
import { AccessHistory, Page, PreparedAccessTransaction } from "@/lib/api/types";
import { useRequiredRole } from "@/lib/auth/use-required-role";
import { sendPreparedTransaction, shortAddress } from "@/lib/web3/provider";

export default function PatientAccessPage() {
  const access = useRequiredRole("PATIENT");
  const [patientWallet, setPatientWallet] = useState("");
  const [doctorWallet, setDoctorWallet] = useState("");
  const [doctorProfileId, setDoctorProfileId] = useState("");
  const [history, setHistory] = useState<AccessHistory[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const wallet = getSession()?.user.wallets[0];
    if (wallet) setPatientWallet(wallet);
    loadHistory();
  }, []);

  async function loadHistory() {
    try {
      const page = await apiFetch<Page<AccessHistory>>("/access-control/history?size=50");
      setHistory(page.content);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Không thể tải lịch sử"); }
  }

  async function updateAccess(granted: boolean) {
    setBusy(true); setMessage("Đang chuẩn bị dữ liệu giao dịch...");
    try {
      const request = { doctorProfileId: Number(doctorProfileId), patientWallet, doctorWallet, granted };
      const prepared = await apiFetch<PreparedAccessTransaction>("/access-control/transactions/prepare", {
        method: "POST", body: JSON.stringify(request),
      });
      setMessage("Hãy xác nhận giao dịch trong MetaMask...");
      const receipt = await sendPreparedTransaction(prepared);
      setMessage("Giao dịch đã được mine. Backend đang xác minh...");
      await apiFetch("/access-control/transactions/verify", {
        method: "POST", body: JSON.stringify({ ...request, transactionHash: receipt.hash }),
      });
      setMessage(granted ? "Đã cấp quyền thành công." : "Đã hủy quyền thành công.");
      await loadHistory();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể cập nhật quyền");
    } finally { setBusy(false); }
  }

  if (access !== "allowed") return <AccessState access={access} />;
  return (
    <section className="grid gap-6">
      <div><p className="label text-blue-700">Patient workspace</p><h1 className="mt-2 text-3xl font-bold">Quản lý quyền truy cập</h1>
        <p className="mt-2 text-slate-600">Mọi thay đổi quyền đều do ví bệnh nhân ký và được backend xác minh on-chain.</p></div>
      <WalletCard onConnected={setPatientWallet} />

      <form className="card grid gap-4" onSubmit={(event) => { event.preventDefault(); updateAccess(true); }}>
        <h2 className="text-lg font-bold">Cấp hoặc hủy quyền bác sĩ</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <label className="grid gap-1 text-sm font-medium">ID hồ sơ bác sĩ<input className="input" type="number" min="1" required value={doctorProfileId} onChange={(e) => setDoctorProfileId(e.target.value)} /></label>
          <label className="grid gap-1 text-sm font-medium">Ví bác sĩ<input className="input font-mono" required pattern="^0x[0-9a-fA-F]{40}$" value={doctorWallet} onChange={(e) => setDoctorWallet(e.target.value)} /></label>
          <label className="grid gap-1 text-sm font-medium">Ví bệnh nhân<input className="input font-mono" required pattern="^0x[0-9a-fA-F]{40}$" value={patientWallet} onChange={(e) => setPatientWallet(e.target.value)} /></label>
        </div>
        {message && <p className="status">{message}</p>}
        <div className="flex flex-wrap gap-3">
          <button className="btn-primary" disabled={busy}>Cấp quyền</button>
          <button className="btn-danger" disabled={busy} type="button" onClick={() => updateAccess(false)}>Hủy quyền</button>
        </div>
      </form>

      <div className="card">
        <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-bold">Lịch sử quyền truy cập</h2><button className="btn-secondary" onClick={loadHistory}>Làm mới</button></div>
        <div className="table-wrap">
          <table><thead><tr><th>Bác sĩ</th><th>Trạng thái</th><th>Transaction</th><th>Thời gian</th></tr></thead>
            <tbody>{history.map((item) => <tr key={item.id}>
              <td><strong>{item.doctorName}</strong><br /><span className="text-xs text-slate-500">{item.doctorCode} · ID {item.doctorProfileId}</span></td>
              <td><span className={item.granted ? "text-green-700" : "text-red-700"}>{item.granted ? "Đã cấp" : "Đã hủy"}</span></td>
              <td className="font-mono text-xs">{shortAddress(item.transactionHash)}</td>
              <td>{new Date(item.occurredAt).toLocaleString("vi-VN")}</td>
            </tr>)}
            {!history.length && <tr><td colSpan={4} className="text-center text-slate-500">Chưa có lịch sử.</td></tr>}</tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
