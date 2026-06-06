"use client";

import { FormEvent, useEffect, useState } from "react";
import { AccessState } from "@/components/access-state";
import { ResponseBox } from "@/components/response-box";
import { apiFetch } from "@/lib/api/client";
import { Department, DoctorProfile, PatientProfile } from "@/lib/api/types";
import { useRequiredRole } from "@/lib/auth/use-required-role";

export default function AdminPage() {
  const access = useRequiredRole("ADMIN");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [department, setDepartment] = useState({ code: "", name: "", description: "" });
  const [editDepartment, setEditDepartment] = useState({ id: "", name: "", description: "", active: true });
  const [doctorId, setDoctorId] = useState("");
  const [patientId, setPatientId] = useState("");
  const [message, setMessage] = useState("");
  const [lastResponse, setLastResponse] = useState<unknown>(null);

  useEffect(() => {
    if (access === "allowed") loadDepartments();
  }, [access]);

  async function loadDepartments() {
    try {
      const data = await apiFetch<Department[]>("/departments");
      setDepartments(data);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Khong the tai khoa phong");
    }
  }

  async function createDepartment(event: FormEvent) {
    event.preventDefault();
    try {
      const created = await apiFetch<Department>("/departments", { method: "POST", body: JSON.stringify(department) });
      setLastResponse(created);
      setMessage("Da tao khoa phong.");
      setDepartment({ code: "", name: "", description: "" });
      await loadDepartments();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Khong the tao khoa phong");
    }
  }

  async function updateDepartment(event: FormEvent) {
    event.preventDefault();
    try {
      const updated = await apiFetch<Department>(`/departments/${editDepartment.id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: editDepartment.name,
          description: editDepartment.description,
          active: editDepartment.active,
        }),
      });
      setLastResponse(updated);
      setMessage("Da cap nhat khoa phong.");
      await loadDepartments();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Khong the cap nhat khoa phong");
    }
  }

  async function getDoctor() {
    try {
      const doctor = await apiFetch<DoctorProfile>(`/doctors/${doctorId}`);
      setLastResponse(doctor);
      setMessage("Da tai thong tin bac si.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Khong the tai bac si");
    }
  }

  async function verifyDoctor(verified: boolean) {
    try {
      const doctor = await apiFetch<DoctorProfile>(`/doctors/${doctorId}/verification`, {
        method: "PUT",
        body: JSON.stringify({ verified }),
      });
      setLastResponse(doctor);
      setMessage(verified ? "Da xac minh bac si." : "Da huy xac minh bac si.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Khong the cap nhat bac si");
    }
  }

  async function getPatient() {
    try {
      const patient = await apiFetch<PatientProfile>(`/patients/${patientId}`);
      setLastResponse(patient);
      setMessage("Da tai thong tin benh nhan.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Khong the tai benh nhan");
    }
  }

  async function syncEvents() {
    try {
      const result = await apiFetch("/blockchain/events/sync", { method: "POST" });
      setLastResponse(result);
      setMessage("Da dong bo blockchain events.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Khong the dong bo events");
    }
  }

  if (access !== "allowed") return <AccessState access={access} />;

  return (
    <section className="grid gap-6">
      <div>
        <p className="label text-blue-700">Admin workspace</p>
        <h1 className="mt-2 text-3xl font-bold">Quan tri he thong</h1>
        <p className="mt-2 text-slate-600">Dung de test cac API chi danh cho ADMIN.</p>
      </div>
      {message && <p className="status">{message}</p>}

      <div className="grid gap-6 lg:grid-cols-2">
        <form className="card grid gap-4" onSubmit={createDepartment}>
          <h2 className="text-lg font-bold">Tao khoa phong</h2>
          <input className="input" placeholder="Code, vi du ENT" required value={department.code} onChange={(e) => setDepartment({ ...department, code: e.target.value })} />
          <input className="input" placeholder="Ten khoa" required value={department.name} onChange={(e) => setDepartment({ ...department, name: e.target.value })} />
          <textarea className="input" placeholder="Mo ta" value={department.description} onChange={(e) => setDepartment({ ...department, description: e.target.value })} />
          <button className="btn-primary">Tao khoa</button>
        </form>

        <form className="card grid gap-4" onSubmit={updateDepartment}>
          <h2 className="text-lg font-bold">Sua khoa phong</h2>
          <select className="input" required value={editDepartment.id} onChange={(e) => {
            const selected = departments.find((item) => item.id === Number(e.target.value));
            setEditDepartment({
              id: e.target.value,
              name: selected?.name || "",
              description: selected?.description || "",
              active: selected?.active ?? true,
            });
          }}>
            <option value="">Chon khoa</option>
            {departments.map((item) => <option value={item.id} key={item.id}>{item.code} - {item.name}</option>)}
          </select>
          <input className="input" placeholder="Ten khoa" required value={editDepartment.name} onChange={(e) => setEditDepartment({ ...editDepartment, name: e.target.value })} />
          <textarea className="input" placeholder="Mo ta" value={editDepartment.description} onChange={(e) => setEditDepartment({ ...editDepartment, description: e.target.value })} />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editDepartment.active} onChange={(e) => setEditDepartment({ ...editDepartment, active: e.target.checked })} /> Active</label>
          <button className="btn-primary">Cap nhat khoa</button>
        </form>

        <div className="card grid gap-4">
          <h2 className="text-lg font-bold">Xac minh bac si</h2>
          <input className="input" type="number" min="1" placeholder="Doctor profile ID" value={doctorId} onChange={(e) => setDoctorId(e.target.value)} />
          <div className="flex flex-wrap gap-2">
            <button className="btn-secondary" onClick={getDoctor}>Xem bac si</button>
            <button className="btn-primary" onClick={() => verifyDoctor(true)}>Verify</button>
            <button className="btn-danger" onClick={() => verifyDoctor(false)}>Unverify</button>
          </div>
        </div>

        <div className="card grid gap-4">
          <h2 className="text-lg font-bold">Benh nhan va blockchain events</h2>
          <input className="input" type="number" min="1" placeholder="Patient profile ID" value={patientId} onChange={(e) => setPatientId(e.target.value)} />
          <div className="flex flex-wrap gap-2">
            <button className="btn-secondary" onClick={getPatient}>Xem benh nhan</button>
            <button className="btn-primary" onClick={syncEvents}>Sync blockchain events</button>
          </div>
        </div>
      </div>

      <ResponseBox title="API response" data={lastResponse} />
    </section>
  );
}
