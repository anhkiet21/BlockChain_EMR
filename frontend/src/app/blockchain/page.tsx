"use client";

import { FormEvent, useState } from "react";
import { ResponseBox } from "@/components/response-box";
import { apiFetch, getSession } from "@/lib/api/client";
import { AccessCheck, OnChainRecord, TransactionState } from "@/lib/api/types";

export default function BlockchainPage() {
  const [patientWallet, setPatientWallet] = useState("");
  const [granteeWallet, setGranteeWallet] = useState("");
  const [recordId, setRecordId] = useState("");
  const [callerWallet, setCallerWallet] = useState("");
  const [transactionHash, setTransactionHash] = useState("");
  const [message, setMessage] = useState("");
  const [response, setResponse] = useState<unknown>(null);

  const isAdmin = getSession()?.user.roles.includes("ADMIN");

  async function checkAccess(event: FormEvent) {
    event.preventDefault();
    try {
      const data = await apiFetch<AccessCheck>(`/blockchain/access?patientWallet=${patientWallet}&granteeWallet=${granteeWallet}`);
      setResponse(data);
      setMessage(data.granted ? "On-chain: co quyen." : "On-chain: chua co quyen.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Khong the kiem tra access");
    }
  }

  async function getRecord(event: FormEvent) {
    event.preventDefault();
    try {
      const data = await apiFetch<OnChainRecord>(`/blockchain/records/${recordId}?callerWallet=${callerWallet}`);
      setResponse(data);
      setMessage(data.exists ? "Da tai record on-chain." : "Record khong ton tai.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Khong the doc record");
    }
  }

  async function getTransaction(event: FormEvent) {
    event.preventDefault();
    try {
      const data = await apiFetch<TransactionState>(`/blockchain/transactions/${transactionHash}`);
      setResponse(data);
      setMessage(data.found ? `Transaction ${data.success ? "success" : "failed/pending"}` : "Khong tim thay transaction.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Khong the doc transaction");
    }
  }

  async function syncEvents() {
    try {
      const data = await apiFetch("/blockchain/events/sync", { method: "POST" });
      setResponse(data);
      setMessage("Da sync blockchain events.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Khong the sync events");
    }
  }

  return (
    <section className="grid gap-6">
      <div>
        <p className="label text-blue-700">Blockchain tools</p>
        <h1 className="mt-2 text-3xl font-bold">Kiem tra blockchain</h1>
        <p className="mt-2 text-slate-600">Dung cho test doc quyen, CID va transaction tu smart contract.</p>
      </div>
      {message && <p className="status">{message}</p>}

      <div className="grid gap-6 lg:grid-cols-3">
        <form className="card grid gap-4" onSubmit={checkAccess}>
          <h2 className="text-lg font-bold">Kiem tra access</h2>
          <input className="input font-mono" required placeholder="Patient wallet" value={patientWallet} onChange={(e) => setPatientWallet(e.target.value)} />
          <input className="input font-mono" required placeholder="Grantee/doctor wallet" value={granteeWallet} onChange={(e) => setGranteeWallet(e.target.value)} />
          <button className="btn-primary">Kiem tra</button>
        </form>

        <form className="card grid gap-4" onSubmit={getRecord}>
          <h2 className="text-lg font-bold">Doc record</h2>
          <input className="input" required type="number" min="0" placeholder="On-chain record ID" value={recordId} onChange={(e) => setRecordId(e.target.value)} />
          <input className="input font-mono" required placeholder="Caller wallet" value={callerWallet} onChange={(e) => setCallerWallet(e.target.value)} />
          <button className="btn-primary">Doc record</button>
        </form>

        <form className="card grid gap-4" onSubmit={getTransaction}>
          <h2 className="text-lg font-bold">Transaction status</h2>
          <input className="input font-mono" required placeholder="0x transaction hash" value={transactionHash} onChange={(e) => setTransactionHash(e.target.value)} />
          <button className="btn-primary">Kiem tra tx</button>
          {isAdmin && <button className="btn-secondary" type="button" onClick={syncEvents}>Admin sync events</button>}
        </form>
      </div>

      <ResponseBox title="Blockchain response" data={response} />
    </section>
  );
}
