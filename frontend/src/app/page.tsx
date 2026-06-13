import Link from "next/link";

const MODULES = [
  ["Xác thực", "/login", "Đăng nhập tài khoản test, đăng ký bệnh nhân/bác sĩ và quản lý phiên JWT."],
  ["Hồ sơ cá nhân", "/profile", "Cập nhật thông tin y tế, vai trò và liên kết ví MetaMask đã xác minh."],
  ["Quyền truy cập", "/patient/access", "Bệnh nhân cấp hoặc thu hồi quyền cho cơ sở y tế bằng giao dịch blockchain."],
  ["Kho file bệnh án", "/patient/files", "Tải file lên IPFS, mã hóa và tải lại file của chính bệnh nhân."],
  ["Không gian bác sĩ", "/doctor/records", "Tìm bệnh nhân, gửi yêu cầu truy cập, tạo bệnh án và tải file khi có quyền."],
  ["Quản trị", "/admin", "Xác minh bác sĩ, khóa tài khoản và đồng bộ trạng thái hệ thống."],
  ["Blockchain", "/blockchain", "Kiểm tra quyền, CID, hash bệnh án và trạng thái transaction on-chain."],
];

export default function Home() {
  return (
    <section className="grid gap-8 py-10">
      <div className="grid gap-6 lg:grid-cols-[1.2fr_.8fr] lg:items-center">
        <div>
          <p className="badge">Hồ sơ bệnh án điện tử</p>
          <h1 className="mt-5 max-w-3xl text-4xl font-black leading-tight tracking-tight text-slate-950 md:text-6xl">
            Quản lý bệnh án an toàn với IPFS, blockchain và quyền do bệnh nhân kiểm soát
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
            Giao diện này gom đầy đủ các luồng chính: xác thực, hồ sơ cá nhân, lưu trữ IPFS,
            cấp quyền truy cập, quản lý bệnh án, quản trị và kiểm tra dữ liệu on-chain.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link className="btn-primary" href="/login">Đăng nhập test</Link>
            <Link className="btn-secondary" href="/dashboard">Mở bảng điều khiển</Link>
          </div>
        </div>
        <div className="card grid gap-4">
          <div>
            <p className="label">Tài khoản mặc định</p>
            <h2 className="mt-2 text-xl font-black">Dùng để kiểm thử nhanh</h2>
          </div>
          <pre className="rounded-2xl bg-slate-950 p-4 text-sm leading-7 text-slate-100">{`079000000001 / password123 (Patient)
079000000002 / password123 (Doctor)
admin@test.local   / password123`}</pre>
          <p className="muted">Dùng Ctrl+F5 nếu trình duyệt vẫn giữ bundle cũ sau khi build lại.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {MODULES.map(([title, href, text]) => (
          <Link className="card transition hover:border-blue-300 hover:shadow-md" href={href} key={href}>
            <p className="badge">Chức năng</p>
            <h2 className="mt-3 text-lg font-black">{title}</h2>
            <p className="mt-2 muted">{text}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
