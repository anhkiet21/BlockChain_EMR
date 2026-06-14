"use client";

import { FormEvent, useEffect, useState } from "react";
import { apiFetch, getSession } from "@/lib/api/client";
import { FacilityAccessCheck, TransactionState } from "@/lib/api/types";

export default function BlockchainPage() {
  const [patientWallet, setPatientWallet] = useState("");
  const [facilityId, setFacilityId] = useState("BV001");
  const [transactionHash, setTransactionHash] = useState("");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<{ label: string; value: string }[]>([]);

  const isAdmin = getSession()?.user.roles.includes("ADMIN");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setTransactionHash(params.get("transactionHash") ?? "");
  }, []);

  async function checkFacilityAccess(event: FormEvent) {
    event.preventDefault();
    try {
      const params = new URLSearchParams({ patientWallet, facilityId });
      const data = await apiFetch<FacilityAccessCheck>(`/blockchain/facility-access?${params}`);
      setResult([
        { label: "Ví bệnh nhân", value: data.patientWallet },
        { label: "Mã cơ sở", value: data.facilityId },
        { label: "Trạng thái quyền", value: data.granted ? "Đã cấp quyền" : "Chưa cấp quyền" },
      ]);
      setMessage("Đã kiểm tra quyền truy cập.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể kiểm tra quyền cơ sở y tế");
    }
  }

  async function getTransaction(event: FormEvent) {
    event.preventDefault();
    try {
      const data = await apiFetch<TransactionState>(`/blockchain/transactions/${transactionHash}`);
      setResult([
        { label: "Mã giao dịch", value: data.transactionHash },
        { label: "Trạng thái", value: data.status === "SUCCESS" ? "Thành công" : data.status === "PENDING" ? "Đang chờ" : "Thất bại" },
        { label: "Khối", value: data.blockNumber ?? "-" },
        { label: "Thông tin lỗi", value: data.failureReason ?? "-" },
      ]);
      setMessage("Đã kiểm tra trạng thái giao dịch.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể đọc giao dịch");
    }
  }

  async function syncEvents() {
    try {
      await apiFetch("/blockchain/events/sync", { method: "POST" });
      setResult([]);
      setMessage("Đã đồng bộ dữ liệu hệ thống.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể đồng bộ dữ liệu");
    }
  }

  return (
    <section className="grid gap-6">
      <div>
        <p className="badge">Công cụ quản trị</p>
        <h1 className="mt-3 section-title">Kiểm tra dữ liệu xác minh</h1>
      </div>
      {message && <p className="status">{message}</p>}

      <div className="grid gap-6 lg:grid-cols-2">
        <form className="card grid gap-4" onSubmit={checkFacilityAccess}>
          <div>
            <h2 className="text-lg font-black">Kiểm tra quyền cơ sở y tế</h2>
          </div>
          <input
            className="input font-mono"
            required
            placeholder="Địa chỉ ví bệnh nhân"
            value={patientWallet}
            onChange={(event) => setPatientWallet(event.target.value)}
          />
          <input
            className="input font-mono"
            required
            placeholder="Mã cơ sở, ví dụ BV001"
            value={facilityId}
            onChange={(event) => setFacilityId(event.target.value.toUpperCase())}
          />
          <button className="btn-primary">Kiểm tra</button>
        </form>

        <form className="card grid gap-4" onSubmit={getTransaction}>
          <h2 className="text-lg font-black">Trạng thái giao dịch</h2>
          <input className="input font-mono" required placeholder="Mã giao dịch 0x..." value={transactionHash} onChange={(e) => setTransactionHash(e.target.value)} />
          <button className="btn-primary">Kiểm tra giao dịch</button>
          {isAdmin && <button className="btn-secondary" type="button" onClick={syncEvents}>Đồng bộ dữ liệu</button>}
        </form>
      </div>

      {result.length > 0 && (
        <section className="card">
          <h2 className="text-lg font-black">Kết quả kiểm tra</h2>
          <dl className="mt-4 grid gap-3 md:grid-cols-2">
            {result.map((item) => (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4" key={item.label}>
                <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">{item.label}</dt>
                <dd className="mt-2 break-all text-sm font-semibold text-slate-900">{item.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </section>
  );
}
