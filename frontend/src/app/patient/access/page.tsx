"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AccessState } from "@/components/access-state";
import { useRequiredRole } from "@/lib/auth/use-required-role";
import { apiFetch, getSession } from "@/lib/api/client";
import { Facility, FacilityAccessCheck, FacilityAccessRequest, Page, PreparedFacilityTransaction } from "@/lib/api/types";
import { sendPreparedTransaction } from "@/lib/web3/provider";

export default function PatientAccessPage() {
  const access = useRequiredRole("PATIENT");
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [requests, setRequests] = useState<FacilityAccessRequest[]>([]);
  const [onChainAccess, setOnChainAccess] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");
  const [accessReady, setAccessReady] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (access === "allowed") load();
  }, [access]);

  async function load() {
    setAccessReady(false);
    setOnChainAccess({});
    try {
      const [facilityData, requestData] = await Promise.all([
        apiFetch<Facility[]>("/facilities"),
        apiFetch<Page<FacilityAccessRequest>>("/patient/access-requests"),
      ]);
      setFacilities(facilityData);
      setRequests(requestData.content);
      const patientWallet = getSession()?.user.wallets[0];
      if (patientWallet) {
        const checks = await Promise.all(facilityData.map((facility) =>
          apiFetch<FacilityAccessCheck>(
            `/blockchain/facility-access?patientWallet=${encodeURIComponent(patientWallet)}&facilityId=${encodeURIComponent(facility.facilityId)}`,
          ),
        ));
        setOnChainAccess(Object.fromEntries(checks.map((check) => [check.facilityId, check.granted])));
      } else {
        setOnChainAccess({});
      }
      setAccessReady(true);
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

  const sortedFacilities = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase("vi");
    return facilities
      .filter((facility) => {
        if (!normalizedQuery) return true;
        return [facility.name, facility.address]
          .some((value) => value.toLocaleLowerCase("vi").includes(normalizedQuery));
      })
      .sort((left, right) => {
        const leftGranted = accessReady && (onChainAccess[left.facilityId] ?? false);
        const rightGranted = accessReady && (onChainAccess[right.facilityId] ?? false);
        if (leftGranted !== rightGranted) return leftGranted ? -1 : 1;
        return left.name.localeCompare(right.name, "vi");
      });
  }, [accessReady, facilities, onChainAccess, searchQuery]);
  const visibleFacilities = sortedFacilities;

  function searchFacilities(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearchQuery(searchInput);
  }

  if (access !== "allowed") return <AccessState access={access} />;

  return (
    <section className="grid gap-6">
      <div>
        <p className="badge">Quản lý quyền truy cập</p>
        <h1 className="mt-3 section-title">Cơ sở y tế</h1>
      </div>

      {message && <p className="status">{message}</p>}

      <form className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center" onSubmit={searchFacilities}>
        <div className="flex-1">
          <input
            className="input"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Nhập tên hoặc địa chỉ bệnh viện"
          />
        </div>
        <button className="btn-primary gap-2" type="submit">
          <svg
            className="h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-4-4" />
          </svg>
          Tìm bệnh viện
        </button>
        {searchQuery && (
          <button
            className="btn-secondary"
            type="button"
            onClick={() => {
              setSearchInput("");
              setSearchQuery("");
            }}
          >
            Xóa lọc
          </button>
        )}
      </form>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-600">
          {searchQuery
            ? `Tìm thấy ${visibleFacilities.length} bệnh viện`
            : `${facilities.length} bệnh viện · kéo ngang để xem thêm`}
        </p>
        <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
          Cơ sở đã cấp quyền được ưu tiên
        </p>
      </div>

      <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4">
        {visibleFacilities.map((facility) => {
          const granted = accessReady && (onChainAccess[facility.facilityId] ?? false);
          return (
            <article
              className="card min-w-[88%] snap-start sm:min-w-[48%] xl:min-w-[calc((100%_-_2rem)/3)]"
              key={facility.facilityId}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-black">{facility.name}</h2>
                </div>
                <span className={accessReady && granted ? "badge border-emerald-100 bg-emerald-50 text-emerald-700" : "badge border-slate-200 bg-slate-50 text-slate-500"}>
                  {!accessReady ? "Đang kiểm tra" : granted ? "Đã cấp" : "Chưa cấp"}
                </span>
              </div>
              <p className="mt-3 muted">{facility.address}</p>
              <button
                className={granted ? "btn-danger mt-5" : "btn-primary mt-5"}
                disabled={!!busy || !accessReady}
                onClick={() => changeAccess(facility.facilityId, !granted)}
              >
                {!accessReady ? "Đang kiểm tra quyền" : granted ? "Thu hồi quyền" : "Cấp quyền"}
              </button>
            </article>
          );
        })}
        {visibleFacilities.length === 0 && (
          <div className="card w-full text-center">
            <p className="font-bold text-slate-800">Không tìm thấy bệnh viện phù hợp.</p>
            <p className="mt-1 muted">Hãy thử tìm bằng tên hoặc địa chỉ bệnh viện.</p>
          </div>
        )}
      </div>

      <div className="card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="label">Yêu cầu đang chờ xử lý</p>
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
              <p className="mt-2 text-xs font-semibold text-slate-500">{requestStatusLabel(request.status)} · {new Date(request.createdAt).toLocaleString("vi-VN")}</p>
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

function requestStatusLabel(status: string) {
  if (status === "PENDING") return "Đang chờ";
  if (status === "APPROVED") return "Đã đồng ý";
  if (status === "REJECTED") return "Đã từ chối";
  return status;
}
