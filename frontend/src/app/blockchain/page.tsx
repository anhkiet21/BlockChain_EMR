"use client";

import { FormEvent, useState } from "react";
import { ResponseBox } from "@/components/response-box";
import { apiFetch, getSession } from "@/lib/api/client";
import { FacilityAccessCheck, OnChainRecord, TransactionState } from "@/lib/api/types";

export default function BlockchainPage() {
  const [patientWallet, setPatientWallet] = useState("");
  const [facilityId, setFacilityId] = useState("BV001");
  const [recordId, setRecordId] = useState("");
  const [callerWallet, setCallerWallet] = useState("");
  const [transactionHash, setTransactionHash] = useState("");
  const [message, setMessage] = useState("");
  const [response, setResponse] = useState<unknown>(null);

  const isAdmin = getSession()?.user.roles.includes("ADMIN");

  async function checkFacilityAccess(event: FormEvent) {
    event.preventDefault();
    try {
      const params = new URLSearchParams({ patientWallet, facilityId });
      const data = await apiFetch<FacilityAccessCheck>(`/blockchain/facility-access?${params}`);
      setResponse(data);
      setMessage(data.granted ? "On-chain: cơ sở y tế đã có quyền." : "On-chain: cơ sở y tế chưa có quyền.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể kiểm tra quyền cơ sở y tế");
    }
  }

  async function getRecord(event: FormEvent) {
    event.preventDefault();
    try {
      const data = await apiFetch<OnChainRecord>(`/blockchain/records/${recordId}?callerWallet=${callerWallet}`);
      setResponse(data);
      setMessage(data.exists ? "Đã tải record on-chain." : "Record không tồn tại.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể đọc record");
    }
  }

  async function getTransaction(event: FormEvent) {
    event.preventDefault();
    try {
      const data = await apiFetch<TransactionState>(`/blockchain/transactions/${transactionHash}`);
      setResponse(data);
      setMessage(`Transaction ${data.status === "SUCCESS" ? "thành công" : data.status === "PENDING" ? "đang chờ" : "thất bại"}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể đọc transaction");
    }
  }

  async function syncEvents() {
    try {
      const data = await apiFetch("/blockchain/events/sync", { method: "POST" });
      setResponse(data);
      setMessage("Đã đồng bộ blockchain events.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể đồng bộ events");
    }
  }

  return (
    <section className="grid gap-6">
      <div>
        <p className="badge">Blockchain tools</p>
        <h1 className="mt-3 section-title">Kiểm tra blockchain</h1>
        <p className="mt-2 text-slate-600">
          Dùng để test quyền cơ sở y tế, CID/hash và trạng thái transaction từ smart contract.
        </p>
      </div>
      {message && <p className="status">{message}</p>}

      <div className="grid gap-6 lg:grid-cols-3">
        <form className="card grid gap-4" onSubmit={checkFacilityAccess}>
          <div>
            <h2 className="text-lg font-black">Kiểm tra quyền cơ sở y tế</h2>
            <p className="mt-1 text-sm text-slate-500">Luồng hiện tại kiểm tra patient wallet + facility ID, không dùng ví bác sĩ.</p>
          </div>
          <input
            className="input font-mono"
            required
            placeholder="Patient wallet"
            value={patientWallet}
            onChange={(event) => setPatientWallet(event.target.value)}
          />
          <input
            className="input font-mono"
            required
            placeholder="Facility ID, ví dụ BV001"
            value={facilityId}
            onChange={(event) => setFacilityId(event.target.value.toUpperCase())}
          />
          <button className="btn-primary">Kiểm tra</button>
        </form>

        <form className="card grid gap-4" onSubmit={getRecord}>
          <h2 className="text-lg font-black">Đọc record</h2>
          <input className="input" required type="number" min="0" placeholder="On-chain record ID" value={recordId} onChange={(e) => setRecordId(e.target.value)} />
          <input className="input font-mono" required placeholder="Caller wallet" value={callerWallet} onChange={(e) => setCallerWallet(e.target.value)} />
          <button className="btn-primary">Đọc record</button>
        </form>

        <form className="card grid gap-4" onSubmit={getTransaction}>
          <h2 className="text-lg font-black">Trạng thái transaction</h2>
          <input className="input font-mono" required placeholder="0x transaction hash" value={transactionHash} onChange={(e) => setTransactionHash(e.target.value)} />
          <button className="btn-primary">Kiểm tra tx</button>
          {isAdmin && <button className="btn-secondary" type="button" onClick={syncEvents}>Admin đồng bộ events</button>}
        </form>
      </div>

      <ResponseBox title="Blockchain response" data={response} />
    </section>
  );
}
