"use client";

import { FormEvent, useEffect, useState } from "react";
import { WalletCard } from "@/components/wallet-card";
import { ResponseBox } from "@/components/response-box";
import { apiFetch, getSession, setSession, User } from "@/lib/api/client";
import { Department, DoctorProfile, PatientProfile } from "@/lib/api/types";

type Message = { text: string; kind: "info" | "error" };

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [patient, setPatient] = useState<Partial<PatientProfile>>({});
  const [doctor, setDoctor] = useState<Partial<DoctorProfile>>({});
  const [departments, setDepartments] = useState<Department[]>([]);
  const [message, setMessage] = useState<Message | null>(null);
  const [lastResponse, setLastResponse] = useState<unknown>(null);

  const isPatient = user?.roles.includes("PATIENT");
  const isDoctor = user?.roles.includes("DOCTOR");

  useEffect(() => {
    const session = getSession();
    if (!session) return;
    setUser(session.user);
    load();
  }, []);

  async function load() {
    try {
      const me = await apiFetch<User>("/auth/me");
      const session = getSession();
      if (session) setSession({ ...session, user: me });
      setUser(me);
      if (me.roles.includes("PATIENT")) setPatient(await apiFetch<PatientProfile>("/patients/me"));
      if (me.roles.includes("DOCTOR")) {
        setDoctor(await apiFetch<DoctorProfile>("/doctors/me"));
        setDepartments(await apiFetch<Department[]>("/departments"));
      }
      setMessage({ text: "Da tai ho so.", kind: "info" });
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : "Khong the tai ho so", kind: "error" });
    }
  }

  async function savePatient(event: FormEvent) {
    event.preventDefault();
    try {
      const saved = await apiFetch<PatientProfile>("/patients/me", {
        method: "PUT",
        body: JSON.stringify({
          fullName: patient.fullName,
          dateOfBirth: patient.dateOfBirth || null,
          gender: patient.gender || null,
          phone: patient.phone || "",
          address: patient.address || "",
          emergencyContactName: patient.emergencyContactName || "",
          emergencyContactPhone: patient.emergencyContactPhone || "",
          bloodType: patient.bloodType || "",
        }),
      });
      setPatient(saved);
      setLastResponse(saved);
      setMessage({ text: "Da luu ho so benh nhan.", kind: "info" });
      await load();
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : "Khong the luu ho so", kind: "error" });
    }
  }

  async function saveDoctor(event: FormEvent) {
    event.preventDefault();
    try {
      const saved = await apiFetch<DoctorProfile>("/doctors/me", {
        method: "PUT",
        body: JSON.stringify({
          fullName: doctor.fullName,
          licenseNumber: doctor.licenseNumber,
          specialization: doctor.specialization,
          departmentId: doctor.department?.id || null,
          phone: doctor.phone || "",
          biography: doctor.biography || "",
        }),
      });
      setDoctor(saved);
      setLastResponse(saved);
      setMessage({ text: "Da luu ho so bac si.", kind: "info" });
      await load();
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : "Khong the luu ho so", kind: "error" });
    }
  }

  if (!user) {
    return <p className="status">Can dang nhap de xem ho so.</p>;
  }

  return (
    <section className="grid gap-6">
      <div>
        <p className="label text-blue-700">Profile</p>
        <h1 className="mt-2 text-3xl font-bold">Ho so va vi</h1>
        <p className="mt-2 text-slate-600">{user.email} · {user.roles.join(", ")}</p>
      </div>

      <WalletCard onConnected={load} />
      {message && <p className={message.kind === "error" ? "status border-red-100 bg-red-50 text-red-900" : "status"}>{message.text}</p>}

      <div className="grid gap-6 lg:grid-cols-2">
        {isPatient && (
          <form className="card grid gap-4" onSubmit={savePatient}>
            <h2 className="text-lg font-bold">Ho so benh nhan</h2>
            <label className="grid gap-1 text-sm font-medium">Ho ten<input className="input" required value={patient.fullName || ""} onChange={(e) => setPatient({ ...patient, fullName: e.target.value })} /></label>
            <label className="grid gap-1 text-sm font-medium">Ngay sinh<input className="input" type="date" value={patient.dateOfBirth || ""} onChange={(e) => setPatient({ ...patient, dateOfBirth: e.target.value })} /></label>
            <label className="grid gap-1 text-sm font-medium">Gioi tinh<select className="input" value={patient.gender || ""} onChange={(e) => setPatient({ ...patient, gender: e.target.value })}><option value="">Chua chon</option><option>MALE</option><option>FEMALE</option><option>OTHER</option></select></label>
            <label className="grid gap-1 text-sm font-medium">Dien thoai<input className="input" value={patient.phone || ""} onChange={(e) => setPatient({ ...patient, phone: e.target.value })} /></label>
            <label className="grid gap-1 text-sm font-medium">Dia chi<textarea className="input" value={patient.address || ""} onChange={(e) => setPatient({ ...patient, address: e.target.value })} /></label>
            <label className="grid gap-1 text-sm font-medium">Nguoi lien he khan cap<input className="input" value={patient.emergencyContactName || ""} onChange={(e) => setPatient({ ...patient, emergencyContactName: e.target.value })} /></label>
            <label className="grid gap-1 text-sm font-medium">SDT khan cap<input className="input" value={patient.emergencyContactPhone || ""} onChange={(e) => setPatient({ ...patient, emergencyContactPhone: e.target.value })} /></label>
            <label className="grid gap-1 text-sm font-medium">Nhom mau<input className="input" placeholder="A+, B-, AB+, O-" value={patient.bloodType || ""} onChange={(e) => setPatient({ ...patient, bloodType: e.target.value })} /></label>
            <button className="btn-primary">Luu ho so benh nhan</button>
          </form>
        )}

        {isDoctor && (
          <form className="card grid gap-4" onSubmit={saveDoctor}>
            <h2 className="text-lg font-bold">Ho so bac si</h2>
            <label className="grid gap-1 text-sm font-medium">Ho ten<input className="input" required value={doctor.fullName || ""} onChange={(e) => setDoctor({ ...doctor, fullName: e.target.value })} /></label>
            <label className="grid gap-1 text-sm font-medium">So giay phep<input className="input" required value={doctor.licenseNumber || ""} onChange={(e) => setDoctor({ ...doctor, licenseNumber: e.target.value })} /></label>
            <label className="grid gap-1 text-sm font-medium">Chuyen khoa<input className="input" required value={doctor.specialization || ""} onChange={(e) => setDoctor({ ...doctor, specialization: e.target.value })} /></label>
            <label className="grid gap-1 text-sm font-medium">Khoa phong<select className="input" value={doctor.department?.id || ""} onChange={(e) => setDoctor({ ...doctor, department: departments.find((item) => item.id === Number(e.target.value)) })}><option value="">Chua chon</option>{departments.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
            <label className="grid gap-1 text-sm font-medium">Dien thoai<input className="input" value={doctor.phone || ""} onChange={(e) => setDoctor({ ...doctor, phone: e.target.value })} /></label>
            <label className="grid gap-1 text-sm font-medium">Gioi thieu<textarea className="input" value={doctor.biography || ""} onChange={(e) => setDoctor({ ...doctor, biography: e.target.value })} /></label>
            <p className={doctor.verified ? "text-sm font-semibold text-green-700" : "text-sm font-semibold text-amber-700"}>{doctor.verified ? "Da duoc xac minh" : "Chua duoc admin xac minh"}</p>
            <button className="btn-primary">Luu ho so bac si</button>
          </form>
        )}

        <div className="card grid gap-4">
          <h2 className="text-lg font-bold">Session hien tai</h2>
          <ResponseBox data={user} />
          <ResponseBox title="Last response" data={lastResponse} />
        </div>
      </div>
    </section>
  );
}
