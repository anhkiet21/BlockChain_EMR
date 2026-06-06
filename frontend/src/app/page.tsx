import Link from "next/link";

export default function Home() {
  return (
    <section className="grid gap-8 py-10 lg:grid-cols-[1.2fr_.8fr] lg:items-center">
      <div>
        <p className="label text-blue-700">Electronic Medical Record</p>
        <h1 className="mt-3 max-w-3xl text-4xl font-bold leading-tight md:text-5xl">
          Bệnh án điện tử với quyền truy cập do bệnh nhân kiểm soát
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-slate-600">
          File được mã hóa trước khi lưu IPFS. Blockchain chỉ giữ CID, hash toàn vẹn và quyền truy cập tối thiểu.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link className="btn-primary" href="/login">Bắt đầu đăng nhập</Link>
          <Link className="btn-secondary" href="/patient/access">Quản lý quyền truy cập</Link>
        </div>
      </div>
      <div className="card grid gap-4">
        {[
          ["1", "Xác thực ứng dụng", "Đăng nhập JWT và liên kết ví bằng chữ ký."],
          ["2", "Bệnh nhân cấp quyền", "MetaMask ký giao dịch trực tiếp với smart contract."],
          ["3", "Bác sĩ tạo bệnh án", "Upload mã hóa, ghi CID/hash on-chain và lưu metadata SQL."],
        ].map(([number, title, text]) => (
          <div className="flex gap-4" key={number}>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-800">{number}</span>
            <div><h2 className="font-semibold">{title}</h2><p className="mt-1 text-sm text-slate-600">{text}</p></div>
          </div>
        ))}
      </div>
    </section>
  );
}
