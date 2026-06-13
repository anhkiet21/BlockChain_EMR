'use client';

import { FormEvent, useEffect, useState } from 'react';
import { WalletCard } from '@/components/wallet-card';
import { ResponseBox } from '@/components/response-box';
import { apiFetch, getSession, setSession, User } from '@/lib/api/client';
import { Department, DoctorProfile, PatientProfile, InstitutionProfile } from '@/lib/api/types';

type AlertKind = 'success' | 'error';
type Alert = { text: string; kind: AlertKind };

function getRoleBadgeClass(role: string): string {
  if (role === 'PATIENT') return 'badge-indigo';
  if (role === 'DOCTOR') return 'badge-emerald';
  if (role === 'ADMIN') return 'badge-red';
  if (role === 'INSTITUTION') return 'badge-violet';
  return 'badge-slate';
}

function getRoleLabel(role: string): string {
  if (role === 'PATIENT') return '🏥 Bệnh nhân';
  if (role === 'DOCTOR') return '👨‍⚕️ Bác sĩ';
  if (role === 'ADMIN') return '🛡️ Quản trị';
  if (role === 'INSTITUTION') return '🏛️ Cơ sở y tế';
  return role;
}

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [patient, setPatient] = useState<Partial<PatientProfile>>({});
  const [doctor, setDoctor] = useState<Partial<DoctorProfile>>({});
  const [departments, setDepartments] = useState<Department[]>([]);
  const [institutions, setInstitutions] = useState<InstitutionProfile[]>([]);
  const [alert, setAlert] = useState<Alert | null>(null);
  const [lastResponse, setLastResponse] = useState<unknown>(null);
  const [savingPatient, setSavingPatient] = useState(false);
  const [savingDoctor, setSavingDoctor] = useState(false);
  const [loading, setLoading] = useState(true);

  const isPatient = user?.roles.includes('PATIENT') ?? false;
  const isDoctor = user?.roles.includes('DOCTOR') ?? false;

  useEffect(() => {
    const session = getSession();
    if (!session) {
      setLoading(false);
      return;
    }
    setUser(session.user);
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const me = await apiFetch<User>('/auth/me');
      const session = getSession();
      if (session) setSession({ ...session, user: me });
      setUser(me);
      if (me.roles.includes('PATIENT')) {
        setPatient(await apiFetch<PatientProfile>('/patients/me'));
      }
      if (me.roles.includes('DOCTOR')) {
        const [doc, deps, insts] = await Promise.all([
          apiFetch<DoctorProfile>('/doctors/me'),
          apiFetch<Department[]>('/departments'),
          apiFetch<InstitutionProfile[]>('/institutions'),
        ]);
        setDoctor(doc);
        setDepartments(deps);
        setInstitutions(insts);
      }
    } catch (error) {
      setAlert({
        text: error instanceof Error ? error.message : 'Không thể tải hồ sơ',
        kind: 'error',
      });
    } finally {
      setLoading(false);
    }
  }

  async function savePatient(event: FormEvent) {
    event.preventDefault();
    setSavingPatient(true);
    setAlert(null);
    try {
      const saved = await apiFetch<PatientProfile>('/patients/me', {
        method: 'PUT',
        body: JSON.stringify({
          fullName: patient.fullName,
          dateOfBirth: patient.dateOfBirth || null,
          gender: patient.gender || null,
          phone: patient.phone || '',
          address: patient.address || '',
          emergencyContactName: patient.emergencyContactName || '',
          emergencyContactPhone: patient.emergencyContactPhone || '',
          bloodType: patient.bloodType || '',
        }),
      });
      setPatient(saved);
      setLastResponse(saved);
      setAlert({ text: '✅ Đã lưu hồ sơ bệnh nhân thành công.', kind: 'success' });
      await load();
    } catch (error) {
      setAlert({
        text: error instanceof Error ? error.message : 'Không thể lưu hồ sơ bệnh nhân',
        kind: 'error',
      });
    } finally {
      setSavingPatient(false);
    }
  }

  async function saveDoctor(event: FormEvent) {
    event.preventDefault();
    setSavingDoctor(true);
    setAlert(null);
    try {
      const saved = await apiFetch<DoctorProfile>('/doctors/me', {
        method: 'PUT',
        body: JSON.stringify({
          fullName: doctor.fullName,
          licenseNumber: doctor.licenseNumber,
          specialization: doctor.specialization,
          departmentId: doctor.department?.id || null,
          institutionId: doctor.institutionId || null,
          phone: doctor.phone || '',
          biography: doctor.biography || '',
        }),
      });
      setDoctor(saved);
      setLastResponse(saved);
      setAlert({ text: '✅ Đã lưu hồ sơ bác sĩ thành công.', kind: 'success' });
      await load();
    } catch (error) {
      setAlert({
        text: error instanceof Error ? error.message : 'Không thể lưu hồ sơ bác sĩ',
        kind: 'error',
      });
    } finally {
      setSavingDoctor(false);
    }
  }

  // ── Not logged in ────────────────────────────────────────────────────────
  if (!loading && !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex items-center justify-center p-6">
        <div className="card text-center max-w-sm w-full animate-scale-in">
          <div className="text-5xl mb-4">🔒</div>
          <h2 className="section-title mb-2">Chưa đăng nhập</h2>
          <p className="text-slate-400 text-sm mb-6">
            Đăng nhập để xem và chỉnh sửa hồ sơ cá nhân của bạn.
          </p>
          <a href="/login" className="btn-primary w-full">
            Đến trang đăng nhập
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-4 md:p-8">
      <div className="max-w-6xl mx-auto grid gap-8">

        {/* ── Page Header ─────────────────────────────────────────────────── */}
        <div className="animate-fade-in">
          <div className="role-pill border-indigo-500/20 bg-indigo-500/10 text-indigo-400">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse" />
            Hồ sơ cá nhân
          </div>

          <div className="flex flex-wrap items-center gap-6 mt-2">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-3xl shadow-xl shadow-indigo-600/30 animate-pulse-glow">
                {user?.fullName?.charAt(0)?.toUpperCase() ?? '?'}
              </div>
              <span className="absolute -bottom-1.5 -right-1.5 h-5 w-5 rounded-full bg-emerald-500 border-2 border-slate-950 shadow" title="Đang hoạt động" />
            </div>

            {/* Name + email + roles */}
            <div className="flex-1 min-w-0">
              {loading ? (
                <div className="h-8 w-48 rounded-lg bg-white/10 animate-pulse mb-2" />
              ) : (
                <h1 className="page-title">
                  {user?.fullName || 'Người dùng'}
                </h1>
              )}
              <p className="text-slate-400 text-sm mt-1">{user?.email}</p>
              <div className="flex flex-wrap gap-2 mt-3">
                {user?.roles.map((role) => (
                  <span key={role} className={getRoleBadgeClass(role)}>
                    {getRoleLabel(role)}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Wallet Card ──────────────────────────────────────────────────── */}
        <div className="animate-fade-in stagger-1">
          <WalletCard onConnected={load} />
        </div>

        {/* ── Alert Banner ─────────────────────────────────────────────────── */}
        {alert && (
          <div
            className={`animate-fade-in flex items-start gap-3 px-5 py-4 rounded-2xl text-sm font-medium ${
              alert.kind === 'success' ? 'alert-success' : 'alert-error'
            }`}
          >
            <span className="text-base mt-0.5">{alert.kind === 'success' ? '✅' : '⚠️'}</span>
            <span className="flex-1">{alert.text}</span>
            <button
              type="button"
              onClick={() => setAlert(null)}
              className="ml-auto text-current opacity-60 hover:opacity-100 transition-opacity text-lg leading-none"
            >
              ×
            </button>
          </div>
        )}

        {/* ── Two-column layout ────────────────────────────────────────────── */}
        <div className="grid gap-6 lg:grid-cols-2 animate-fade-in stagger-2">

          {/* ── LEFT: Patient or Doctor Form ─────────────────────────────── */}
          <div className="grid gap-6">

            {/* Patient form */}
            {isPatient && (
              <form className="card grid gap-5" onSubmit={savePatient}>
                <div className="flex items-center gap-3 pb-4 border-b border-white/10">
                  <div className="h-10 w-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-xl">
                    🏥
                  </div>
                  <div>
                    <h2 className="section-title">Hồ sơ bệnh nhân</h2>
                    {patient.patientCode && (
                      <p className="text-xs text-slate-500 font-mono mt-0.5">Mã: {patient.patientCode}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="form-label">Họ và tên *</label>
                  <input
                    className="input"
                    required
                    placeholder="Nguyễn Văn A"
                    value={patient.fullName || ''}
                    onChange={(e) => setPatient({ ...patient, fullName: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Ngày sinh</label>
                    <input
                      className="input"
                      type="date"
                      value={patient.dateOfBirth || ''}
                      onChange={(e) => setPatient({ ...patient, dateOfBirth: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="form-label">Giới tính</label>
                    <select
                      className="input"
                      value={patient.gender || ''}
                      onChange={(e) => setPatient({ ...patient, gender: e.target.value })}
                    >
                      <option value="">Chưa chọn</option>
                      <option value="MALE">Nam</option>
                      <option value="FEMALE">Nữ</option>
                      <option value="OTHER">Khác</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="form-label">Số điện thoại</label>
                  <input
                    className="input"
                    type="tel"
                    placeholder="0901 234 567"
                    value={patient.phone || ''}
                    onChange={(e) => setPatient({ ...patient, phone: e.target.value })}
                  />
                </div>

                <div>
                  <label className="form-label">Địa chỉ</label>
                  <textarea
                    className="input min-h-[80px] resize-none"
                    placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành phố"
                    value={patient.address || ''}
                    onChange={(e) => setPatient({ ...patient, address: e.target.value })}
                  />
                </div>

                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 grid gap-4">
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                    Người liên hệ khẩn cấp
                  </p>
                  <div>
                    <label className="form-label">Họ tên người liên hệ</label>
                    <input
                      className="input"
                      placeholder="Nguyễn Thị B"
                      value={patient.emergencyContactName || ''}
                      onChange={(e) => setPatient({ ...patient, emergencyContactName: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="form-label">SĐT khẩn cấp</label>
                    <input
                      className="input"
                      type="tel"
                      placeholder="0901 234 567"
                      value={patient.emergencyContactPhone || ''}
                      onChange={(e) => setPatient({ ...patient, emergencyContactPhone: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="form-label">Nhóm máu</label>
                  <input
                    className="input"
                    placeholder="VD: A+, B-, AB+, O-"
                    value={patient.bloodType || ''}
                    onChange={(e) => setPatient({ ...patient, bloodType: e.target.value })}
                  />
                </div>

                <button className="btn-primary" disabled={savingPatient}>
                  {savingPatient ? (
                    <>
                      <span className="spinner-sm border-white/40 border-t-white" />
                      Đang lưu...
                    </>
                  ) : (
                    'Lưu thông tin'
                  )}
                </button>
              </form>
            )}

            {/* Doctor form */}
            {isDoctor && (
              <form className="card grid gap-5" onSubmit={saveDoctor}>
                <div className="flex items-center justify-between gap-3 pb-4 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-xl">
                      👨‍⚕️
                    </div>
                    <div>
                      <h2 className="section-title">Hồ sơ bác sĩ</h2>
                      {doctor.doctorCode && (
                        <p className="text-xs text-slate-500 font-mono mt-0.5">Mã BS: {doctor.doctorCode}</p>
                      )}
                    </div>
                  </div>
                  <span
                    className={doctor.verified ? 'badge badge-emerald' : 'badge badge-amber'}
                  >
                    {doctor.verified ? (
                      <>
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        Đã được xác minh
                      </>
                    ) : (
                      <>
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                        Chưa được admin xác minh
                      </>
                    )}
                  </span>
                </div>

                <div>
                  <label className="form-label">Họ và tên *</label>
                  <input
                    className="input"
                    required
                    placeholder="BS. Nguyễn Văn A"
                    value={doctor.fullName || ''}
                    onChange={(e) => setDoctor({ ...doctor, fullName: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Số giấy phép *</label>
                    <input
                      className="input font-mono"
                      required
                      placeholder="VN-BS-00001"
                      value={doctor.licenseNumber || ''}
                      onChange={(e) => setDoctor({ ...doctor, licenseNumber: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="form-label">Chuyên khoa *</label>
                    <input
                      className="input"
                      required
                      placeholder="Nội khoa"
                      value={doctor.specialization || ''}
                      onChange={(e) => setDoctor({ ...doctor, specialization: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="form-label">Khoa phòng</label>
                  <select
                    className="input"
                    value={doctor.department?.id || ''}
                    onChange={(e) =>
                      setDoctor({
                        ...doctor,
                        department: departments.find((d) => d.id === Number(e.target.value)),
                      })
                    }
                  >
                    <option value="">— Chưa chọn khoa —</option>
                    {departments.map((dep) => (
                      <option key={dep.id} value={dep.id}>
                        {dep.name}{dep.code ? ` (${dep.code})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="form-label">Cơ sở y tế liên kết</label>
                  <div className="flex gap-3">
                    <select
                      className="input flex-1"
                      value={doctor.institutionId || ''}
                      onChange={(e) =>
                        setDoctor({
                          ...doctor,
                          institutionId: e.target.value ? Number(e.target.value) : undefined,
                        })
                      }
                    >
                      <option value="">— Chưa liên kết cơ sở y tế —</option>
                      {institutions.map((inst) => (
                        <option key={inst.id} value={inst.id}>
                          {inst.institutionName} ({inst.institutionCode})
                        </option>
                      ))}
                    </select>
                    {doctor.institutionStatus && (
                      <span className={`badge shrink-0 self-center ${
                        doctor.institutionStatus === 'APPROVED' ? 'badge-emerald' :
                        doctor.institutionStatus === 'PENDING' ? 'badge-amber' : 'badge-red'
                      }`}>
                        {doctor.institutionStatus === 'APPROVED' ? 'Đã duyệt' :
                         doctor.institutionStatus === 'PENDING' ? 'Chờ duyệt' : 'Từ chối'}
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="form-label">Số điện thoại</label>
                  <input
                    className="input"
                    type="tel"
                    placeholder="0901 234 567"
                    value={doctor.phone || ''}
                    onChange={(e) => setDoctor({ ...doctor, phone: e.target.value })}
                  />
                </div>

                <div>
                  <label className="form-label">Giới thiệu bản thân</label>
                  <textarea
                    className="input min-h-[100px] resize-none"
                    placeholder="Mô tả kinh nghiệm, chuyên môn và thành tích của bạn..."
                    value={doctor.biography || ''}
                    onChange={(e) => setDoctor({ ...doctor, biography: e.target.value })}
                  />
                </div>

                <button className="btn-primary" disabled={savingDoctor}>
                  {savingDoctor ? (
                    <>
                      <span className="spinner-sm border-white/40 border-t-white" />
                      Đang lưu...
                    </>
                  ) : (
                    'Lưu thông tin'
                  )}
                </button>
              </form>
            )}

            {/* No profile role placeholder */}
            {!isPatient && !isDoctor && !loading && (
              <div className="card flex flex-col items-center justify-center py-16 text-center gap-4">
                <div className="text-5xl">📋</div>
                <h3 className="section-title">Không có hồ sơ chuyên biệt</h3>
                <p className="text-slate-400 text-sm max-w-xs">
                  Tài khoản này chưa có vai trò bệnh nhân hoặc bác sĩ. Liên hệ quản trị viên để được cấp quyền.
                </p>
              </div>
            )}
          </div>

          {/* ── RIGHT: Session info ──────────────────────────────────────── */}
          <div className="grid gap-6 content-start">
            <div className="card grid gap-4">
              <div className="flex items-center gap-3 pb-4 border-b border-white/10">
                <div className="h-10 w-10 rounded-xl bg-violet-500/20 flex items-center justify-center text-xl">
                  🔐
                </div>
                <div>
                  <h2 className="section-title">Thông tin phiên làm việc</h2>
                  <p className="text-slate-500 text-xs mt-0.5">Dữ liệu phiên hiện tại từ sessionStorage</p>
                </div>
              </div>

              {loading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className="h-4 rounded bg-white/10 animate-pulse"
                      style={{ width: `${60 + i * 8}%` }}
                    />
                  ))}
                </div>
              ) : (
                <>
                  <ResponseBox title="Thông tin tài khoản" data={user} />
                  {lastResponse && (
                    <ResponseBox title="Phản hồi lần lưu gần nhất" data={lastResponse} />
                  )}
                </>
              )}
            </div>

            {/* Wallet list */}
            {user?.wallets && user.wallets.length > 0 && (
              <div className="card grid gap-3">
                <div className="flex items-center gap-2 pb-3 border-b border-white/10">
                  <span className="text-lg">💳</span>
                  <h3 className="text-sm font-semibold text-white">Ví blockchain đã liên kết</h3>
                </div>
                {user.wallets.map((wallet, idx) => (
                  <div
                    key={wallet}
                    className="flex items-center gap-3 rounded-xl bg-white/[0.03] border border-white/10 px-4 py-3"
                  >
                    <span className="h-7 w-7 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span className="font-mono text-xs text-slate-300 truncate">{wallet}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Quick stat tiles */}
            <div className="grid grid-cols-2 gap-3">
              <div className="card p-4">
                <p className="label mb-1">Vai trò</p>
                <p className="text-white font-bold text-lg">{user?.roles.length ?? 0}</p>
              </div>
              <div className="card p-4">
                <p className="label mb-1">Ví liên kết</p>
                <p className="text-white font-bold text-lg">{user?.wallets.length ?? 0}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
