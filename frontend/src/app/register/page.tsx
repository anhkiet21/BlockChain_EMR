"use client";

import { FormEvent, useEffect, useState } from "react";
import { publicApi, Session, setSession } from "@/lib/api/client";
import { Facility } from "@/lib/api/types";

export default function RegisterPage() {
  const [role, setRole] = useState<"PATIENT" | "DOCTOR">("PATIENT");
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [form, setForm] = useState({ identityNumber: "", password: "password123", fullName: "", dateOfBirth: "", gender: "MALE", phoneNumber: "", address: "", licenseNumber: "", facilityId: "" });
  const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  useEffect(() => { publicApi<Facility[]>("/facilities").then(setFacilities).catch(() => setMessage("Khong tai duoc danh sach co so y te")); }, []);

  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const body = role === "PATIENT"
        ? { identityNumber: form.identityNumber, password: form.password, fullName: form.fullName, dateOfBirth: form.dateOfBirth, gender: form.gender, phoneNumber: form.phoneNumber, address: form.address }
        : { identityNumber: form.identityNumber, password: form.password, fullName: form.fullName, dateOfBirth: form.dateOfBirth, gender: form.gender, phoneNumber: form.phoneNumber, licenseNumber: form.licenseNumber, facilityId: form.facilityId };
      const session = await publicApi<Session>(`/auth/register/${role.toLowerCase()}`, { method: "POST", body: JSON.stringify(body) });
      setSession(session); location.href = "/profile";
    } catch (error) { setMessage(error instanceof Error ? error.message : "Dang ky that bai"); }
    finally { setBusy(false); }
  }

  const field = (key: keyof typeof form, value: string) => setForm({ ...form, [key]: value });
  return <section className="mx-auto max-w-2xl py-10"><form className="card grid gap-4" onSubmit={submit}>
    <div><p className="label">Tai khoan moi</p><h1 className="mt-2 text-2xl font-bold">Dang ky</h1></div>
    <label className="grid gap-1 text-sm font-medium">Vai tro<select className="input" value={role} onChange={(e) => setRole(e.target.value as "PATIENT" | "DOCTOR")}><option>PATIENT</option><option>DOCTOR</option></select></label>
    <div className="grid gap-4 md:grid-cols-2">
      <label className="grid gap-1 text-sm font-medium">CCCD / ma dinh danh<input className="input" required value={form.identityNumber} onChange={(e) => field("identityNumber", e.target.value)} /></label>
      <label className="grid gap-1 text-sm font-medium">Mat khau<input className="input" type="password" minLength={8} required value={form.password} onChange={(e) => field("password", e.target.value)} /></label>
      <label className="grid gap-1 text-sm font-medium">Ho ten<input className="input" required value={form.fullName} onChange={(e) => field("fullName", e.target.value)} /></label>
      <label className="grid gap-1 text-sm font-medium">Ngay sinh<input className="input" type="date" required value={form.dateOfBirth} onChange={(e) => field("dateOfBirth", e.target.value)} /></label>
      <label className="grid gap-1 text-sm font-medium">Gioi tinh<select className="input" value={form.gender} onChange={(e) => field("gender", e.target.value)}><option>MALE</option><option>FEMALE</option><option>OTHER</option></select></label>
      <label className="grid gap-1 text-sm font-medium">So dien thoai<input className="input" required value={form.phoneNumber} onChange={(e) => field("phoneNumber", e.target.value)} /></label>
      {role === "PATIENT" ? <label className="grid gap-1 text-sm font-medium md:col-span-2">Dia chi<textarea className="input" required value={form.address} onChange={(e) => field("address", e.target.value)} /></label> : <>
        <label className="grid gap-1 text-sm font-medium">Ma chung chi hanh nghe<input className="input" required value={form.licenseNumber} onChange={(e) => field("licenseNumber", e.target.value)} /></label>
        <label className="grid gap-1 text-sm font-medium">Co so y te<select className="input" required value={form.facilityId} onChange={(e) => field("facilityId", e.target.value)}><option value="">Chon co so</option>{facilities.map((f) => <option key={f.facilityId} value={f.facilityId}>{f.facilityId} - {f.name}</option>)}</select></label>
      </>}
    </div>
    {message && <p className="status">{message}</p>}
    <button className="btn-primary" disabled={busy}>{busy ? "Dang tao..." : "Dang ky"}</button>
  </form></section>;
}
