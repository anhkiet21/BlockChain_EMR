"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { ApiClientError, apiFetch, getSession } from "@/lib/api/client";
import { FacilityAccessCheck, OnChainRecord, TransactionState } from "@/lib/api/types";

type RecordIdType = "system" | "blockchain";
const NO_PREVIOUS_RECORD_ID = "115792089237316195423570985008687907853269984665640564039457584007913129639935";

export default function BlockchainPage() {
  const session = getSession();
  const [patientWallet, setPatientWallet] = useState("");
  const [facilityId, setFacilityId] = useState("BV001");
  const [recordId, setRecordId] = useState("");
  const [recordIdType, setRecordIdType] = useState<RecordIdType>("system");
  const [transactionHash, setTransactionHash] = useState("");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<{ label: string; value: string }[]>([]);
  const [checkingRecord, setCheckingRecord] = useState(false);
  const autoChecked = useRef(false);

  const isAdmin = session?.user.roles.includes("ADMIN") ?? false;
  const isPatient = session?.user.roles.includes("PATIENT") ?? false;
  const canCheckFacilityAccess = isAdmin || isPatient;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const queryRecordId = params.get("recordId") ?? "";
    const queryRecordIdType = params.get("recordIdType") === "blockchain" ? "blockchain" : "system";
    setRecordId(queryRecordId);
    setRecordIdType(queryRecordIdType);
    setTransactionHash(params.get("transactionHash") ?? "");
    setPatientWallet(params.get("patientWallet") ?? session?.user.wallets[0] ?? "");

    if (queryRecordId && !autoChecked.current) {
      autoChecked.current = true;
      void readRecord(queryRecordId, queryRecordIdType);
    }
  }, []);

  async function checkFacilityAccess(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    setResult([]);
    try {
      const params = new URLSearchParams({ patientWallet, facilityId });
      const data = await apiFetch<FacilityAccessCheck>(`/blockchain/facility-access?${params}`);
      setResult([
        { label: "Ví bệnh nhân", value: data.patientWallet },
        { label: "Mã cơ sở", value: data.facilityId },
        { label: "Trạng thái quyền", value: data.granted ? "Đã cấp quyền" : "Chưa cấp quyền" },
      ]);
      setMessage("Đã kiểm tra quyền truy cập.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể kiểm tra quyền cơ sở y tế");
    }
  }

  async function getRecord(event: FormEvent) {
    event.preventDefault();
    await readRecord(recordId, recordIdType);
  }

  async function readRecord(identifier: string, type: RecordIdType) {
    const normalizedId = identifier.trim();
    if (!/^\d+$/.test(normalizedId)) {
      setResult([]);
      setMessage("Mã hồ sơ phải là một số nguyên không âm.");
      return;
    }
    setCheckingRecord(true);
    setMessage("");
    setResult([]);
    try {
      const path = type === "system"
        ? `/blockchain/records/by-system-id/${normalizedId}`
        : `/blockchain/records/${normalizedId}`;
      const data = await apiFetch<OnChainRecord>(path);
      setResult([
        { label: "Mã hồ sơ blockchain (onChainRecordId)", value: data.recordId },
        { label: "Ví bệnh nhân", value: data.patientWallet },
        { label: "Ví người tạo", value: data.authorWallet },
        { label: "CID lưu trữ IPFS", value: data.cid },
        { label: "Mã toàn vẹn (contentHash)", value: data.contentHash ?? "-" },
        { label: "Phiên bản trước", value: previousRecordLabel(data.previousRecordId) },
        { label: "Thời gian ghi blockchain", value: data.createdAt ? new Date(data.createdAt).toLocaleString("vi-VN") : "-" },
        { label: "Trạng thái phiên bản", value: data.latestVersion ? "Tồn tại · phiên bản hiện hành" : "Tồn tại · đã có bản đính chính" },
      ]);
      setMessage(type === "system"
        ? `Đã tìm hồ sơ hệ thống #${normalizedId} và đối chiếu thành công trên blockchain.`
        : `Đã đối chiếu hồ sơ blockchain #${normalizedId}.`);
    } catch (error) {
      setMessage(recordReadError(error, type));
    } finally {
      setCheckingRecord(false);
    }
  }

  async function getTransaction(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    setResult([]);
    try {
      const data = await apiFetch<TransactionState>(`/blockchain/transactions/${transactionHash}`);
      setResult([
        { label: "Mã giao dịch", value: data.transactionHash },
        { label: "Trạng thái", value: data.status === "SUCCESS" ? "Thành công" : data.status === "PENDING" ? "Đang chờ" : "Thất bại" },
        { label: "Khối", value: data.blockNumber ?? "-" },
        { label: "Thông tin lỗi", value: data.failureReason ?? "-" },
      ]);
      setMessage("Đã kiểm tra trạng thái giao dịch.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể đọc giao dịch");
    }
  }

  async function syncEvents() {
    try {
      await apiFetch("/blockchain/events/sync", { method: "POST" });
      setResult([]);
      setMessage("Đã đồng bộ dữ liệu hệ thống.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể đồng bộ dữ liệu");
    }
  }

  return (
    <section className="grid gap-6">
      <div>
        <p className="badge">Công cụ xác minh</p>
        <h1 className="mt-3 section-title">Kiểm tra dữ liệu xác minh</h1>
        <p className="mt-2 text-slate-600">
          Quyền đọc được xác định từ tài khoản đang đăng nhập. Bạn không cần nhập địa chỉ ví kiểm tra.
        </p>
      </div>
      {message && <p className="status">{message}</p>}

      <div className={`grid gap-6 ${canCheckFacilityAccess ? "lg:grid-cols-3" : "lg:grid-cols-2"}`}>
        {canCheckFacilityAccess && <form className="card grid gap-4" onSubmit={checkFacilityAccess}>
          <div>
            <h2 className="text-lg font-black">Kiểm tra quyền cơ sở y tế</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              {isAdmin ? "Quản trị viên có thể nhập ví bệnh nhân cần đối chiếu." : "Chỉ kiểm tra ví đã xác minh của tài khoản bệnh nhân này."}
            </p>
          </div>
          <label className="grid gap-2 text-sm font-bold text-slate-700">
            Ví bệnh nhân
            <input
              className="input font-mono"
              required
              readOnly={!isAdmin}
              placeholder={isAdmin ? "0x..." : "Tài khoản chưa xác minh ví"}
              value={patientWallet}
              onChange={(event) => setPatientWallet(event.target.value)}
            />
          </label>
          <label className="grid gap-2 text-sm font-bold text-slate-700">
            Mã cơ sở
            <input
              className="input font-mono"
              required
              placeholder="Ví dụ BV001"
              value={facilityId}
              onChange={(event) => setFacilityId(event.target.value.toUpperCase())}
            />
          </label>
          <button className="btn-primary" disabled={!patientWallet}>Kiểm tra quyền</button>
        </form>}

        <form className="card grid gap-4" onSubmit={getRecord}>
          <h2 className="text-lg font-black">Kiểm tra hồ sơ</h2>
          <p className="text-xs leading-5 text-slate-500">
            Chọn đúng loại mã đã sao chép. Mã hệ thống và mã blockchain là hai bộ đếm khác nhau.
          </p>
          <label className="grid gap-2 text-sm font-bold text-slate-700">
            Loại mã
            <select className="input" value={recordIdType} onChange={(event) => setRecordIdType(event.target.value as RecordIdType)}>
              <option value="system">Mã hồ sơ hệ thống (recordId)</option>
              <option value="blockchain">Mã hồ sơ blockchain (onChainRecordId)</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm font-bold text-slate-700">
            {recordIdType === "system" ? "Mã hồ sơ hệ thống (recordId)" : "Mã hồ sơ blockchain (onChainRecordId)"}
            <input
              className="input font-mono"
              required
              type="number"
              min="0"
              step="1"
              placeholder={recordIdType === "system" ? "Ví dụ: 12" : "Ví dụ: 3"}
              value={recordId}
              onChange={(event) => setRecordId(event.target.value)}
            />
          </label>
          <button className="btn-primary" disabled={checkingRecord}>
            {checkingRecord ? "Đang đối chiếu..." : "Kiểm tra hồ sơ"}
          </button>
        </form>

        <form className="card grid gap-4" onSubmit={getTransaction}>
          <h2 className="text-lg font-black">Trạng thái giao dịch</h2>
          <input className="input font-mono" required placeholder="Mã giao dịch 0x..." value={transactionHash} onChange={(e) => setTransactionHash(e.target.value)} />
          <button className="btn-primary">Kiểm tra giao dịch</button>
          {isAdmin && <button className="btn-secondary" type="button" onClick={syncEvents}>Đồng bộ dữ liệu</button>}
        </form>
      </div>

      {result.length > 0 && (
        <section className="card">
          <h2 className="text-lg font-black">Kết quả kiểm tra</h2>
          <dl className="mt-4 grid gap-3 md:grid-cols-2">
            {result.map((item) => (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4" key={item.label}>
                <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">{item.label}</dt>
                <dd className="mt-2 break-all text-sm font-semibold text-slate-900">{item.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </section>
  );
}

function previousRecordLabel(value?: string) {
  if (!value || value === NO_PREVIOUS_RECORD_ID) return "Không có · đây là phiên bản đầu";
  return `On-chain #${value}`;
}

function recordReadError(error: unknown, type: RecordIdType) {
  if (error instanceof ApiClientError) {
    if (error.status === 404) {
      return type === "system"
        ? "Không tìm thấy recordId này trong hệ thống. Hãy sao chép mã ở mục “Mã hồ sơ hệ thống (recordId)”."
        : "Không tìm thấy onChainRecordId liên kết với hồ sơ hệ thống. Hãy kiểm tra lại loại mã đã chọn.";
    }
    if (error.status === 403) {
      return "Tài khoản hiện tại không có quyền xem hồ sơ này hoặc quyền truy cập đã hết hiệu lực.";
    }
    if (error.code === "BLOCKCHAIN_UNAVAILABLE") {
      return "Không thể kết nối blockchain. Hãy kiểm tra Anvil/RPC và cấu hình địa chỉ contract.";
    }
    if (error.code === "BLOCKCHAIN_READ_FAILED") {
      return "Hồ sơ có trong hệ thống nhưng không đọc được từ contract hiện tại. Có thể Anvil hoặc contract đã được triển khai lại sau khi hồ sơ được tạo.";
    }
  }
  return error instanceof Error ? error.message : "Không thể đối chiếu hồ sơ trên blockchain.";
}
