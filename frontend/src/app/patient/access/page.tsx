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
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");

  useEffect(() => {
    if (access === "allowed") load();
  }, [access]);

  async function load() {
    try {
      const [facilityData, grantData, requestData] = await Promise.all([
        apiFetch<Facility[]>("/facilities"),
        apiFetch<FacilityGrant[]>("/patient/access/grants"),
        apiFetch<Page<FacilityAccessRequest>>("/patient/access-requests"),
      ]);
      setFacilities(facilityData);
      setGrants(grantData);
      setRequests(requestData.content);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không tải được dữ liệu");
    }
  }

  async function changeAccess(facilityId: string, granted: boolean, requestId?: number) {
    setBusy(`${facilityId}-${granted}`);
    setMessage("");
    try {
      const prepared = await apiFetch<PreparedFacilityTransaction>("/patient/access/transactions/prepare", {
        method: "POST",
        body: JSON.stringify({ facilityId, granted }),
      });
      const receipt = await sendPreparedTransaction(prepared);
      if (requestId) {
        await apiFetch(`/patient/access-requests/${requestId}/approve`, { method: "POST", body: JSON.stringify({ transactionHash: receipt.hash }) });
      } else {
        await apiFetch(`/patient/access/transactions/confirm?transactionHash=${receipt.hash}`, {
          method: "POST",
          body: JSON.stringify({ facilityId, granted }),
        });
      }
      setMessage(granted ? "Đã cấp quyền cho cơ sở y tế." : "Đã thu hồi quyền.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Giao dịch thất bại");
    } finally {
      setBusy("");
    }
  }

  async function reject(id: number) {
    try {
      await apiFetch(`/patient/access-requests/${id}/reject`, { method: "POST" });
      setMessage("Đã từ chối yêu cầu.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể từ chối");
    }
  }

  if (access !== "allowed") return <AccessState access={access} />;

  const active = new Map(grants.map((g) => [g.facilityId, g.active]));

  return (
    <section className="grid gap-6">
      <div>
        <p className="badge">Đồng thuận của bệnh nhân</p>
        <h1 className="mt-3 section-title">Quyền truy cập theo cơ sở y tế</h1>
        <p className="mt-2 text-slate-600">
          Quyền được ghi trên blockchain theo ví bệnh nhân và mã cơ sở y tế. Backend đồng bộ trạng thái để hiển thị và audit.
        </p>
      </div>

      {message && <p className="status">{message}</p>}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {facilities.map((facility) => {
          const granted = active.get(facility.facilityId);
          return (
            <article className="card" key={facility.facilityId}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="badge">{facility.facilityId}</p>
                  <h2 className="mt-3 text-lg font-black">{facility.name}</h2>
                </div>
                <span className={granted ? "badge border-emerald-100 bg-emerald-50 text-emerald-700" : "badge border-slate-200 bg-slate-50 text-slate-500"}>
                  {granted ? "Đã cấp" : "Chưa cấp"}
                </span>
              </div>
              <p className="mt-3 muted">{facility.address}</p>
              <button
                className={granted ? "btn-danger mt-5" : "btn-primary mt-5"}
                disabled={!!busy}
                onClick={() => changeAccess(facility.facilityId, !granted)}
              >
                {granted ? "Thu hồi quyền" : "Cấp quyền"}
              </button>
            </article>
          );
        })}
      </div>

      <div className="card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="label">Access request</p>
            <h2 className="mt-2 text-xl font-black">Yêu cầu truy cập từ bác sĩ</h2>
          </div>
          <button className="btn-secondary" onClick={load}>Làm mới</button>
        </div>
        <div className="mt-4 grid gap-3">
          {requests.length === 0 && <p className="muted">Chưa có yêu cầu truy cập.</p>}
          {requests.map((request) => (
            <div className="rounded-2xl border border-slate-200 bg-white p-4" key={request.requestId}>
              <p className="font-bold">Bác sĩ {request.doctorName} thuộc {request.facilityName} yêu cầu quyền truy cập hồ sơ.</p>
              <p className="mt-1 muted">{request.reason}</p>
              <p className="mt-2 text-xs font-semibold text-slate-500">{request.status} · {new Date(request.createdAt).toLocaleString("vi-VN")}</p>
              {request.status === "PENDING" && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button className="btn-primary" disabled={!!busy} onClick={() => changeAccess(request.facilityId, true, request.requestId)}>
                    Đồng ý và ký MetaMask
                  </button>
                  <button className="btn-danger" onClick={() => reject(request.requestId)}>Từ chối</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
