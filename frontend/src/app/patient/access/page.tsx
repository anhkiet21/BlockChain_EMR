"use client";

import { useEffect, useState } from "react";
import { AccessState } from "@/components/access-state";
import { useRequiredRole } from "@/lib/auth/use-required-role";
import { apiFetch } from "@/lib/api/client";
import { Facility, FacilityAccessRequest, FacilityGrant, Page, PreparedFacilityTransaction } from "@/lib/api/types";
import { sendPreparedTransaction } from "@/lib/web3/provider";

export default function PatientAccessPage() {
  const access = useRequiredRole("PATIENT");
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [grants, setGrants] = useState<FacilityGrant[]>([]);
  const [requests, setRequests] = useState<FacilityAccessRequest[]>([]);
  const [message, setMessage] = useState(""); const [busy, setBusy] = useState("");
  useEffect(() => { if (access === "allowed") load(); }, [access]);

  async function load() {
    try {
      const [facilityData, grantData, requestData] = await Promise.all([
        apiFetch<Facility[]>("/facilities"), apiFetch<FacilityGrant[]>("/patient/access/grants"),
        apiFetch<Page<FacilityAccessRequest>>("/patient/access-requests"),
      ]);
      setFacilities(facilityData); setGrants(grantData); setRequests(requestData.content);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Khong tai duoc du lieu"); }
  }

  async function changeAccess(facilityId: string, granted: boolean, requestId?: number) {
    setBusy(`${facilityId}-${granted}`); setMessage("");
    try {
      const prepared = await apiFetch<PreparedFacilityTransaction>("/patient/access/transactions/prepare", {
        method: "POST", body: JSON.stringify({ facilityId, granted }),
      });
      const receipt = await sendPreparedTransaction(prepared);
      if (requestId) {
        await apiFetch(`/patient/access-requests/${requestId}/approve`, { method: "POST", body: JSON.stringify({ transactionHash: receipt.hash }) });
      } else {
        await apiFetch(`/patient/access/transactions/confirm?transactionHash=${receipt.hash}`, {
          method: "POST", body: JSON.stringify({ facilityId, granted }),
        });
      }
      setMessage(granted ? "Da cap quyen cho co so y te." : "Da thu hoi quyen."); await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Giao dich that bai"); }
    finally { setBusy(""); }
  }

  async function reject(id: number) {
    try { await apiFetch(`/patient/access-requests/${id}/reject`, { method: "POST" }); setMessage("Da tu choi yeu cau."); await load(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Khong the tu choi"); }
  }

  if (access !== "allowed") return <AccessState access={access} />;
  const active = new Map(grants.map((g) => [g.facilityId, g.active]));
  return <section className="grid gap-6">
    <div><p className="label text-blue-700">Patient consent</p><h1 className="mt-2 text-3xl font-bold">Quyen truy cap theo co so y te</h1><p className="mt-2 text-slate-600">Quyen duoc ghi tren blockchain theo patient wallet va facilityId.</p></div>
    {message && <p className="status">{message}</p>}
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{facilities.map((f) => <article className="card" key={f.facilityId}>
      <p className="label">{f.facilityId}</p><h2 className="mt-2 font-bold">{f.name}</h2><p className="mt-2 text-sm text-slate-600">{f.address}</p>
      <button className={active.get(f.facilityId) ? "btn-danger mt-4" : "btn-primary mt-4"} disabled={!!busy}
        onClick={() => changeAccess(f.facilityId, !active.get(f.facilityId))}>{active.get(f.facilityId) ? "Thu hoi quyen" : "Cap quyen"}</button>
    </article>)}</div>
    <div className="card"><h2 className="text-lg font-bold">Yeu cau truy cap</h2><div className="mt-4 grid gap-3">{requests.length === 0 && <p className="text-sm text-slate-500">Chua co yeu cau.</p>}{requests.map((r) => <div className="rounded-xl border p-4" key={r.requestId}>
      <p className="font-semibold">Bac si {r.doctorName} thuoc {r.facilityName} yeu cau quyen truy cap ho so.</p><p className="mt-1 text-sm text-slate-600">{r.reason}</p><p className="mt-1 text-xs text-slate-500">{r.status} · {new Date(r.createdAt).toLocaleString()}</p>
      {r.status === "PENDING" && <div className="mt-3 flex gap-2"><button className="btn-primary" disabled={!!busy} onClick={() => changeAccess(r.facilityId, true, r.requestId)}>Dong y va ky MetaMask</button><button className="btn-danger" onClick={() => reject(r.requestId)}>Tu choi</button></div>}
    </div>)}</div></div>
  </section>;
}
