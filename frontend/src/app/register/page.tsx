"use client";

import { FormEvent, useEffect, useState } from "react";
import { publicApi, Session, setSession } from "@/lib/api/client";
import { Facility } from "@/lib/api/types";

export default function RegisterPage() {
  const [role, setRole] = useState<"PATIENT" | "DOCTOR">("PATIENT");
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [form, setForm] = useState({
    identityNumber: "",
    password: "password123",
    fullName: "",
    dateOfBirth: "",
    gender: "MALE",
    phoneNumber: "",
    address: "",
    licenseNumber: "",
    facilityId: "",
  });
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    publicApi<Facility[]>("/facilities").then(setFacilities).catch(() => setMessage("Không tải được danh sách cơ sở y tế"));
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const body = role === "PATIENT"
        ? {
            identityNumber: form.identityNumber,
            password: form.password,
            fullName: form.fullName,
            dateOfBirth: form.dateOfBirth,
            gender: form.gender,
            phoneNumber: form.phoneNumber,
            address: form.address,
          }
        : {
            identityNumber: form.identityNumber,
            password: form.password,
            fullName: form.fullName,
            dateOfBirth: form.dateOfBirth,
            gender: form.gender,
            phoneNumber: form.phoneNumber,
            licenseNumber: form.licenseNumber,
            facilityId: form.facilityId,
          };
      const session = await publicApi<Session>(`/auth/register/${role.toLowerCase()}`, { method: "POST", body: JSON.stringify(body) });
      setSession(session);
      location.href = "/profile";
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Đăng ký thất bại");
    } finally {
      setBusy(false);
    }
  }

  const field = (key: keyof typeof form, value: string) => setForm({ ...form, [key]: value });

  return (
    <section className="mx-auto max-w-3xl py-10">
      <form className="card grid gap-5" onSubmit={submit}>
        <div>
          <p className="badge">Tài khoản mới</p>
          <h1 className="mt-3 section-title">Đăng ký người dùng</h1>
          <p className="mt-2 muted">Chọn đúng vai trò để backend tạo hồ sơ bệnh nhân hoặc hồ sơ bác sĩ tương ứng.</p>
        </div>
        <label className="grid gap-2 text-sm font-bold text-slate-700">
          Vai trò
          <select className="input" value={role} onChange={(e) => setRole(e.target.value as "PATIENT" | "DOCTOR")}>
            <option value="PATIENT">Bệnh nhân</option>
            <option value="DOCTOR">Bác sĩ</option>
          </select>
        </label>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-bold text-slate-700">
            CCCD / mã định danh
            <input className="input" required value={form.identityNumber} onChange={(e) => field("identityNumber", e.target.value)} />
          </label>
          <label className="grid gap-2 text-sm font-bold text-slate-700">
            Mật khẩu
            <input className="input" type="password" minLength={8} required value={form.password} onChange={(e) => field("password", e.target.value)} />
          </label>
          <label className="grid gap-2 text-sm font-bold text-slate-700">
            Họ tên
            <input className="input" required value={form.fullName} onChange={(e) => field("fullName", e.target.value)} />
          </label>
          <label className="grid gap-2 text-sm font-bold text-slate-700">
            Ngày sinh
            <input className="input" type="date" required value={form.dateOfBirth} onChange={(e) => field("dateOfBirth", e.target.value)} />
          </label>
          <label className="grid gap-2 text-sm font-bold text-slate-700">
            Giới tính
            <select className="input" value={form.gender} onChange={(e) => field("gender", e.target.value)}>
              <option value="MALE">Nam</option>
              <option value="FEMALE">Nữ</option>
              <option value="OTHER">Khác</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm font-bold text-slate-700">
            Số điện thoại
            <input className="input" required value={form.phoneNumber} onChange={(e) => field("phoneNumber", e.target.value)} />
          </label>
          {role === "PATIENT" ? (
            <label className="grid gap-2 text-sm font-bold text-slate-700 md:col-span-2">
              Địa chỉ
              <textarea className="input" required value={form.address} onChange={(e) => field("address", e.target.value)} />
            </label>
          ) : (
            <>
              <label className="grid gap-2 text-sm font-bold text-slate-700">
                Mã chứng chỉ hành nghề
                <input className="input" required value={form.licenseNumber} onChange={(e) => field("licenseNumber", e.target.value)} />
              </label>
              <label className="grid gap-2 text-sm font-bold text-slate-700">
                Cơ sở y tế
                <select className="input" required value={form.facilityId} onChange={(e) => field("facilityId", e.target.value)}>
                  <option value="">Chọn cơ sở</option>
                  {facilities.map((f) => <option key={f.facilityId} value={f.facilityId}>{f.facilityId} - {f.name}</option>)}
                </select>
              </label>
            </>
          )}
        </div>
        {message && <p className="status">{message}</p>}
        <button className="btn-primary" disabled={busy}>{busy ? "Đang tạo tài khoản..." : "Đăng ký"}</button>
      </form>
    </section>
  );
}
