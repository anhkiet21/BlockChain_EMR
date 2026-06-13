"use client";

import { useEffect, useState } from "react";
import { AccessState } from "@/components/access-state";
import { useRequiredRole } from "@/lib/auth/use-required-role";
import { apiFetch } from "@/lib/api/client";
import { DoctorProfile, Page } from "@/lib/api/types";

export default function AdminPage() {
  const access = useRequiredRole("ADMIN"); const [doctors, setDoctors] = useState<DoctorProfile[]>([]); const [message, setMessage] = useState("");
  useEffect(() => { if (access === "allowed") load(); }, [access]);
  async function load() { try { setDoctors((await apiFetch<Page<DoctorProfile>>("/admin/doctors/pending")).content); } catch (e) { setMessage(e instanceof Error ? e.message : "Khong tai duoc danh sach"); } }
  async function action(id: number, type: "verify" | "reject") { try { await apiFetch(`/admin/doctors/${id}/${type}`, { method: "POST" }); setMessage(type === "verify" ? "Da xac minh bac si." : "Da tu choi bac si."); await load(); } catch (e) { setMessage(e instanceof Error ? e.message : "Cap nhat that bai"); } }
  async function lock(userId: number) { try { await apiFetch(`/admin/users/${userId}/lock`, { method: "POST" }); setMessage("Da khoa tai khoan."); await load(); } catch (e) { setMessage(e instanceof Error ? e.message : "Khoa that bai"); } }
  if (access !== "allowed") return <AccessState access={access} />;
  return <section className="grid gap-6"><div><p className="label text-blue-700">System admin</p><h1 className="mt-2 text-3xl font-bold">Xac minh bac si</h1><p className="mt-2 text-slate-600">Admin quan ly trang thai backend, khong can vi MetaMask.</p></div>{message && <p className="status">{message}</p>}
    <div className="table-wrap"><table><thead><tr><th>Bac si</th><th>CCCD</th><th>Chung chi</th><th>Co so</th><th>Vi</th><th>Trang thai</th><th>Hanh dong</th></tr></thead><tbody>{doctors.map((d) => <tr key={d.id}><td><b>{d.fullName}</b><br /><span className="text-xs">{d.phone}</span></td><td>{d.identityNumberMasked ?? "-"}</td><td>{d.licenseNumber}</td><td>{d.facility?.facilityId}<br />{d.facility?.name}</td><td className="max-w-xs break-all text-xs">{d.wallets?.[0] ?? "Chua lien ket"}</td><td>{d.verificationStatus}</td><td><div className="flex flex-wrap gap-2"><button className="btn-primary" onClick={() => action(d.id, "verify")}>Verify</button><button className="btn-danger" onClick={() => action(d.id, "reject")}>Reject</button><button className="btn-secondary" onClick={() => lock(d.userId)}>Lock</button></div></td></tr>)}</tbody></table></div>
  </section>;
}
