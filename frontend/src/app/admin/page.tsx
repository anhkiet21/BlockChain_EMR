"use client";

import { useEffect, useState } from "react";
import { AccessState } from "@/components/access-state";
import { useRequiredRole } from "@/lib/auth/use-required-role";
import { apiFetch } from "@/lib/api/client";
import { DoctorProfile, Page } from "@/lib/api/types";

export default function AdminPage() {
  const access = useRequiredRole("ADMIN");
  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (access === "allowed") load();
  }, [access]);

  async function load() {
    try {
      setDoctors((await apiFetch<Page<DoctorProfile>>("/admin/doctors/pending")).content);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không tải được danh sách");
    }
  }

  async function action(id: number, type: "verify" | "reject") {
    try {
      await apiFetch(`/admin/doctors/${id}/${type}`, { method: "POST" });
      setMessage(type === "verify" ? "Đã xác minh bác sĩ." : "Đã từ chối bác sĩ.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Cập nhật thất bại");
    }
  }

  async function lock(userId: number) {
    try {
      await apiFetch(`/admin/users/${userId}/lock`, { method: "POST" });
      setMessage("Đã khóa tài khoản.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Khóa thất bại");
    }
  }

  if (access !== "allowed") return <AccessState access={access} />;

  return (
    <section className="grid gap-6">
      <div>
        <p className="badge">Quản trị hệ thống</p>
        <h1 className="mt-3 section-title">Xác minh bác sĩ</h1>
        <p className="mt-2 text-slate-600">Admin quản lý trạng thái backend, không cần ví MetaMask cho thao tác xác minh.</p>
      </div>

      {message && <p className="status">{message}</p>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Bác sĩ</th><th>CCCD</th><th>Chứng chỉ</th><th>Cơ sở</th><th>Ví</th><th>Trạng thái</th><th>Hành động</th></tr>
          </thead>
          <tbody>
            {doctors.map((doctor) => (
              <tr key={doctor.id}>
                <td><b>{doctor.fullName}</b><br /><span className="text-xs text-slate-500">{doctor.phone}</span></td>
                <td>{doctor.identityNumberMasked ?? "-"}</td>
                <td>{doctor.licenseNumber}</td>
                <td>{doctor.facility?.facilityId}<br />{doctor.facility?.name}</td>
                <td className="max-w-xs break-all font-mono text-xs">{doctor.wallets?.[0] ?? "Chưa liên kết"}</td>
                <td>{doctor.verificationStatus}</td>
                <td>
                  <div className="flex flex-wrap gap-2">
                    <button className="btn-primary" onClick={() => action(doctor.id, "verify")}>Xác minh</button>
                    <button className="btn-danger" onClick={() => action(doctor.id, "reject")}>Từ chối</button>
                    <button className="btn-secondary" onClick={() => lock(doctor.userId)}>Khóa</button>
                  </div>
                </td>
              </tr>
            ))}
            {!doctors.length && <tr><td colSpan={7} className="text-center text-slate-500">Không có bác sĩ đang chờ xử lý.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}
