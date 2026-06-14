"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AccessState } from "@/components/access-state";
import { apiFetch } from "@/lib/api/client";
import {
  AdminAccessAudit,
  AdminFacility,
  AdminPatient,
  DoctorProfile,
  FacilityConsistency,
  Page,
  SystemAuditEvent,
  UnifiedMedicalRecord,
} from "@/lib/api/types";
import { useRequiredRole } from "@/lib/auth/use-required-role";

type Tab = "doctors" | "patients" | "facilities" | "audit";
type IconName = "doctor" | "patient" | "facility" | "chain" | "search" | "wallet";

const TABS: { id: Tab; label: string; description: string; icon: IconName }[] = [
  { id: "doctors", label: "Bác sĩ chờ xác thực", description: "Duyệt chứng chỉ và tài khoản", icon: "doctor" },
  { id: "patients", label: "Danh sách bệnh nhân", description: "Quản lý trạng thái tài khoản", icon: "patient" },
  { id: "facilities", label: "Cơ sở y tế", description: "Danh mục cơ sở đã cấu hình", icon: "facility" },
  { id: "audit", label: "Nhật ký hệ thống", description: "Theo dõi giao dịch và dữ liệu xác minh", icon: "chain" },
];

function Icon({ name, className = "h-5 w-5" }: { name: IconName; className?: string }) {
  const paths: Record<IconName, React.ReactNode> = {
    doctor: <><path d="M9 12h6M12 9v6"/><path d="M7 4.5a5 5 0 0 1 10 0V6a5 5 0 0 1-10 0V4.5Z"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
    patient: <><circle cx="12" cy="7" r="4"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0"/></>,
    facility: <><path d="M3 21h18M5 21V5h14v16M9 9h6M12 6v6M8 14h2m4 0h2m-8 3h2m4 0h2"/></>,
    chain: <><path d="M10 13a5 5 0 0 0 7.1.1l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1"/><path d="M14 11a5 5 0 0 0-7.1-.1l-2 2A5 5 0 0 0 12 20l1.1-1.1"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    wallet: <><path d="M4 6.5A2.5 2.5 0 0 1 6.5 4H19v16H6.5A2.5 2.5 0 0 1 4 17.5v-11Z"/><path d="M4 8h15M15 12h6v4h-6a2 2 0 0 1 0-4Z"/></>,
  };
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{paths[name]}</svg>;
}

function StatusPill({ active, activeText = "Hoạt động", inactiveText = "Đã khóa" }: { active: boolean; activeText?: string; inactiveText?: string }) {
  return <span className={`admin-pill ${active ? "admin-pill-success" : "admin-pill-danger"}`}><i />{active ? activeText : inactiveText}</span>;
}

function shortHash(value?: string) {
  if (!value) return "-";
  return value.length > 18 ? `${value.slice(0, 10)}…${value.slice(-6)}` : value;
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

export default function AdminPage() {
  const access = useRequiredRole("ADMIN");
  const [tab, setTab] = useState<Tab>("doctors");
  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [patients, setPatients] = useState<AdminPatient[]>([]);
  const [facilities, setFacilities] = useState<AdminFacility[]>([]);
  const [facilityConsistency, setFacilityConsistency] = useState<FacilityConsistency[]>([]);
  const [accessAudit, setAccessAudit] = useState<AdminAccessAudit[]>([]);
  const [recordAudit, setRecordAudit] = useState<UnifiedMedicalRecord[]>([]);
  const [systemAudit, setSystemAudit] = useState<SystemAuditEvent[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const [doctorPage, patientPage, facilityList, consistencyList, accessPage, recordPage, systemPage] = await Promise.all([
        apiFetch<Page<DoctorProfile>>("/admin/doctors/pending?size=100"),
        apiFetch<Page<AdminPatient>>("/admin/patients?size=100"),
        apiFetch<AdminFacility[]>("/admin/facilities"),
        apiFetch<FacilityConsistency[]>("/admin/facilities/consistency"),
        apiFetch<Page<AdminAccessAudit>>("/admin/audit/access?size=100"),
        apiFetch<Page<UnifiedMedicalRecord>>("/admin/audit/records?size=100"),
        apiFetch<Page<SystemAuditEvent>>("/admin/audit/system?size=100"),
      ]);
      setDoctors(doctorPage.content);
      setPatients(patientPage.content);
      setFacilities(facilityList);
      setFacilityConsistency(consistencyList);
      setAccessAudit(accessPage.content);
      setRecordAudit(recordPage.content);
      setSystemAudit(systemPage.content);
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Không thể tải dữ liệu quản trị." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (access === "allowed") void load(); }, [access, load]);

  async function doctorAction(doctor: DoctorProfile, action: "verify" | "reject" | "lock" | "unlock") {
    setBusyId(doctor.userId);
    setMessage(null);
    try {
      const path = action === "verify" || action === "reject"
        ? `/admin/doctors/${doctor.id}/${action}`
        : `/admin/users/${doctor.userId}/${action}`;
      const reason = action === "reject"
        ? window.prompt("Nhập lý do từ chối hồ sơ bác sĩ:", "Hồ sơ chưa đáp ứng yêu cầu xác thực.")
        : null;
      if (action === "reject" && reason === null) return;
      await apiFetch(path, {
        method: "POST",
        body: action === "verify" || action === "reject"
          ? JSON.stringify({ reason: reason || undefined })
          : undefined,
      });
      setMessage({ type: "ok", text: action === "verify" ? "Đã xác thực bác sĩ." : action === "reject" ? "Đã từ chối hồ sơ bác sĩ." : action === "lock" ? "Đã khóa tài khoản." : "Đã mở khóa tài khoản." });
      await load();
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Cập nhật thất bại." });
    } finally { setBusyId(null); }
  }

  async function togglePatient(patient: AdminPatient) {
    setBusyId(patient.userId);
    try {
      const action = patient.accountStatus === "ACTIVE" ? "lock" : "unlock";
      await apiFetch(`/admin/users/${patient.userId}/${action}`, { method: "POST" });
      setPatients((current) => current.map((item) => item.userId === patient.userId
        ? { ...item, accountStatus: action === "lock" ? "LOCKED" : "ACTIVE" }
        : item));
      setMessage({ type: "ok", text: action === "lock" ? "Đã khóa tài khoản bệnh nhân." : "Đã mở khóa tài khoản bệnh nhân." });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Cập nhật thất bại." });
    } finally { setBusyId(null); }
  }

  const normalized = query.trim().toLocaleLowerCase("vi");
  const filteredDoctors = doctors.filter((d) => [d.fullName, d.licenseNumber, d.identityNumberMasked, d.facility?.name].some((v) => v?.toLocaleLowerCase("vi").includes(normalized)));
  const filteredPatients = patients.filter((p) => [p.fullName, p.patientCode, p.identityNumberMasked, p.phone].some((v) => v?.toLocaleLowerCase("vi").includes(normalized)));
  const filteredFacilities = facilities.filter((f) => [f.facilityId, f.name, f.address].some((v) => v.toLocaleLowerCase("vi").includes(normalized)));
  const auditRows = useMemo(() => [
    ...accessAudit.map((item) => ({ id: `access-${item.id}`, action: item.action, actor: item.actorName, detail: `${item.facilityId} · ${item.facilityName}`, cid: "-", hash: "-", txHash: item.transactionHash, reason: "", state: "", time: item.occurredAt })),
    ...recordAudit.map((item) => ({ id: `record-${item.recordId}`, action: "UPLOAD_RECORD", actor: item.uploaderName, detail: item.originalFileName, cid: item.cid, hash: item.contentHash, txHash: item.blockchainTxHash, reason: "", state: item.status, time: item.createdAt })),
    ...systemAudit.map((item) => ({ id: `system-${item.id}`, action: item.action, actor: item.actorName, detail: `${item.targetName ?? item.targetType} · ${item.targetType} #${item.targetId}`, cid: "-", hash: "-", txHash: item.transactionHash ?? "", reason: item.reason ?? "", state: [item.previousState, item.newState].filter(Boolean).join(" → "), time: item.occurredAt })),
  ].sort((a, b) => +new Date(b.time) - +new Date(a.time)), [accessAudit, recordAudit, systemAudit]);
  const filteredAudit = auditRows.filter((row) => [row.action, row.actor, row.detail, row.cid, row.hash, row.txHash, row.reason, row.state].some((v) => v?.toLocaleLowerCase("vi").includes(normalized)));

  if (access !== "allowed") return <AccessState access={access} />;

  const statCards = [
    { label: "Chờ xác thực", value: doctors.length, note: "Hồ sơ bác sĩ cần xử lý", icon: "doctor" as IconName, tone: "amber" },
    { label: "Bệnh nhân", value: patients.length, note: `${patients.filter((p) => p.walletLinked).length} ví đã liên kết`, icon: "patient" as IconName, tone: "blue" },
    { label: "Cơ sở y tế", value: facilities.length, note: `${facilities.filter((f) => f.active).length} đang hoạt động`, icon: "facility" as IconName, tone: "violet" },
    { label: "Nhật ký hệ thống", value: auditRows.length, note: "Bản ghi đã xác minh", icon: "chain" as IconName, tone: "emerald" },
  ];

  return (
    <section className="admin-shell">
      <div className="admin-hero">
        <div>
          <span className="admin-eyebrow">TRUNG TÂM QUẢN TRỊ MEDCHAIN</span>
          <h1>Quản trị hệ thống</h1>
          <p>Xác thực người dùng, giám sát cơ sở y tế và theo dõi lịch sử hoạt động.</p>
        </div>
        <button className="admin-refresh" onClick={() => void load()} disabled={loading}>{loading ? "Đang đồng bộ…" : "Làm mới dữ liệu"}</button>
      </div>

      <div className="admin-stats">
        {statCards.map((card) => <article className="admin-stat" key={card.label}>
          <div className={`admin-stat-icon admin-stat-${card.tone}`}><Icon name={card.icon} /></div>
          <div><span>{card.label}</span><strong>{loading ? "–" : card.value}</strong><small>{card.note}</small></div>
        </article>)}
      </div>

      {message && <div className={`admin-notice ${message.type === "error" ? "admin-notice-error" : ""}`}>{message.text}</div>}

      <div className="admin-workspace">
        <aside className="admin-sidebar">
          <p>QUẢN LÝ</p>
          {TABS.map((item) => <button key={item.id} className={tab === item.id ? "active" : ""} onClick={() => { setTab(item.id); setQuery(""); }}>
            <span className="admin-tab-icon"><Icon name={item.icon} /></span>
            <span><b>{item.label}</b><small>{item.description}</small></span>
            {item.id === "doctors" && doctors.length > 0 && <em>{doctors.length}</em>}
          </button>)}
          <div className="admin-chain-health"><span><i /> Hệ thống xác minh</span><b>Đang hoạt động</b><small>Dữ liệu giao dịch sẵn sàng để đối chiếu.</small></div>
        </aside>

        <main className="admin-content">
          <div className="admin-content-head">
            <div><span>{TABS.find((item) => item.id === tab)?.description}</span><h2>{TABS.find((item) => item.id === tab)?.label}</h2></div>
            <label className="admin-search"><Icon name="search" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm kiếm…" /></label>
          </div>

          {loading ? <div className="admin-empty">Đang tải dữ liệu quản trị…</div> : <>
            {tab === "doctors" && <DoctorsTable doctors={filteredDoctors} busyId={busyId} onAction={doctorAction} />}
            {tab === "patients" && <PatientsTable patients={filteredPatients} busyId={busyId} onToggle={togglePatient} />}
            {tab === "facilities" && <FacilitiesTable facilities={filteredFacilities} consistency={facilityConsistency} />}
            {tab === "audit" && <AuditTable rows={filteredAudit} />}
          </>}
        </main>
      </div>
    </section>
  );
}

function DoctorsTable({ doctors, busyId, onAction }: { doctors: DoctorProfile[]; busyId: number | null; onAction: (doctor: DoctorProfile, action: "verify" | "reject" | "lock" | "unlock") => void }) {
  return <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Bác sĩ</th><th>Định danh</th><th>Chứng chỉ hành nghề</th><th>Cơ sở y tế</th><th>Ví điện tử</th><th>Trạng thái</th><th>Hành động</th></tr></thead><tbody>
    {doctors.map((doctor) => <tr key={doctor.id}><td><div className="admin-person"><span>{doctor.fullName.slice(0, 1).toUpperCase()}</span><div><b>{doctor.fullName}</b><small>{doctor.doctorCode}</small></div></div></td><td><b>{doctor.identityNumberMasked ?? "-"}</b><small className="admin-cell-note">CCCD / Mã định danh</small></td><td><code>{doctor.licenseNumber}</code></td><td><b>{doctor.facility?.name ?? "Chưa gán"}</b><small className="admin-cell-note">{doctor.facility?.facilityId ?? "-"}</small></td><td>{doctor.wallets.length ? <span className="admin-wallet"><Icon name="wallet" />Đã liên kết</span> : <span className="admin-muted">Chưa liên kết</span>}</td><td><StatusPill active={doctor.accountStatus === "ACTIVE"} activeText="Chờ xác thực" inactiveText="Đã khóa" /></td><td><div className="admin-actions"><button className="admin-action-approve" disabled={busyId === doctor.userId || !doctor.wallets.length} onClick={() => onAction(doctor, "verify")}>Xác thực</button><button disabled={busyId === doctor.userId} onClick={() => onAction(doctor, "reject")}>Từ chối</button><button className={doctor.accountStatus === "ACTIVE" ? "admin-action-lock" : "admin-action-unlock"} disabled={busyId === doctor.userId} onClick={() => onAction(doctor, doctor.accountStatus === "ACTIVE" ? "lock" : "unlock")}>{doctor.accountStatus === "ACTIVE" ? "Khóa" : "Mở khóa"}</button></div></td></tr>)}
    {!doctors.length && <EmptyRow columns={7} text="Không có bác sĩ chờ xác thực." />}
  </tbody></table></div>;
}

function PatientsTable({ patients, busyId, onToggle }: { patients: AdminPatient[]; busyId: number | null; onToggle: (patient: AdminPatient) => void }) {
  return <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Bệnh nhân</th><th>Định danh</th><th>Số điện thoại</th><th>Ví điện tử</th><th>Trạng thái</th><th>Hành động</th></tr></thead><tbody>
    {patients.map((patient) => <tr key={patient.id}><td><div className="admin-person admin-person-blue"><span>{patient.fullName.slice(0, 1).toUpperCase()}</span><div><b>{patient.fullName}</b><small>{patient.patientCode}</small></div></div></td><td><b>{patient.identityNumberMasked ?? "-"}</b></td><td>{patient.phone ?? "-"}</td><td>{patient.walletLinked ? <span className="admin-wallet"><Icon name="wallet" />Đã liên kết</span> : <span className="admin-muted">Chưa liên kết</span>}</td><td><StatusPill active={patient.accountStatus === "ACTIVE"} /></td><td><button className={`admin-single-action ${patient.accountStatus === "ACTIVE" ? "danger" : "success"}`} disabled={busyId === patient.userId} onClick={() => onToggle(patient)}>{patient.accountStatus === "ACTIVE" ? "Khóa tài khoản" : "Mở khóa"}</button></td></tr>)}
    {!patients.length && <EmptyRow columns={6} text="Không tìm thấy bệnh nhân." />}
  </tbody></table></div>;
}

function FacilitiesTable({ facilities, consistency }: { facilities: AdminFacility[]; consistency: FacilityConsistency[] }) {
  const consistencyById = new Map(consistency.map((item) => [item.facilityId, item]));
  return <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Mã cơ sở</th><th>Tên cơ sở y tế</th><th>Địa chỉ</th><th>Database</th><th>Blockchain</th><th>Đồng bộ</th></tr></thead><tbody>
    {facilities.map((facility) => {
      const check = consistencyById.get(facility.facilityId);
      return <tr key={facility.facilityId}><td><code className="admin-code-purple">{facility.facilityId}</code></td><td><div className="admin-person admin-person-purple"><span><Icon name="facility" /></span><div><b>{facility.name}</b><small>Cơ sở y tế</small></div></div></td><td className="admin-address">{facility.address}</td><td><StatusPill active={facility.active} activeText="Đang hoạt động" inactiveText="Ngừng hoạt động" /></td><td>{check?.blockchainActive == null ? <span className="admin-muted">Không đọc được</span> : <StatusPill active={check.blockchainActive} activeText="Đang hoạt động" inactiveText="Ngừng hoạt động" />}</td><td>{check?.synchronizedState ? <span className="admin-wallet">Đã đồng bộ</span> : <span className="admin-pill admin-pill-danger"><i />{check?.status === "BLOCKCHAIN_UNAVAILABLE" ? "Blockchain lỗi" : "Lệch trạng thái"}</span>}</td></tr>;
    })}
    {!facilities.length && <EmptyRow columns={6} text="Không tìm thấy cơ sở y tế." />}
  </tbody></table></div>;
}

type AuditRow = { id: string; action: string; actor: string; detail: string; cid: string; hash: string; txHash: string; reason: string; state: string; time: string };
function AuditTable({ rows }: { rows: AuditRow[] }) {
  const labels: Record<string, string> = {
    GRANT_ACCESS: "Cấp quyền",
    REVOKE_ACCESS: "Thu hồi quyền",
    UPLOAD_RECORD: "Tải hồ sơ lên",
    DOCTOR_VERIFIED: "Xác thực bác sĩ",
    DOCTOR_REJECTED: "Từ chối bác sĩ",
    DOCTOR_RESUBMITTED: "Gửi duyệt lại",
    USER_LOCKED: "Khóa tài khoản",
    USER_UNLOCKED: "Mở khóa tài khoản",
    EMERGENCY_ACCESS_ENDED: "Kết thúc quyền khẩn cấp",
  };
  return <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Sự kiện</th><th>Người thực hiện</th><th>Đối tượng / hồ sơ</th><th>Mã lưu trữ / toàn vẹn</th><th>Mã giao dịch</th><th>Thời gian</th></tr></thead><tbody>
    {rows.map((row) => <tr key={row.id}><td><span className={`admin-event admin-event-${row.action.toLowerCase().replaceAll("_", "-")}`}><Icon name={row.action === "UPLOAD_RECORD" ? "chain" : "wallet"} />{labels[row.action] ?? row.action}</span></td><td><b>{row.actor}</b></td><td>{row.detail}{row.state && <small className="admin-cell-note">{row.state}</small>}{row.reason && <small className="admin-cell-note">Lý do: {row.reason}</small>}</td><td><code title={`${row.cid}\n${row.hash}`}>{shortHash(row.cid)}<br/><span>{shortHash(row.hash)}</span></code></td><td>{row.txHash ? <button className="admin-tx font-mono" title={row.txHash} onClick={() => void navigator.clipboard.writeText(row.txHash)}>{shortHash(row.txHash)}</button> : <span className="admin-muted">Không áp dụng</span>}</td><td className="admin-time">{formatTime(row.time)}</td></tr>)}
    {!rows.length && <EmptyRow columns={6} text="Chưa có giao dịch blockchain nào được ghi nhận." />}
  </tbody></table></div>;
}

function EmptyRow({ columns, text }: { columns: number; text: string }) {
  return <tr><td colSpan={columns}><div className="admin-empty">{text}</div></td></tr>;
}
