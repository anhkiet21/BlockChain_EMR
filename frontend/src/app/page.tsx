import Link from "next/link";

const MODULES = [
  ["Auth", "/login", "Dang nhap seed account, dang ky Patient/Doctor, refresh/logout token."],
  ["Profile", "/profile", "Cap nhat ho so, xem role va lien ket vi MetaMask."],
  ["Patient", "/patient/access", "Cap/huy quyen truy cap va xem lich su."],
  ["Patient files", "/patient/files", "Upload, list va download file cua benh nhan."],
  ["Doctor", "/doctor/records", "Tim benh nhan, upload file, tao benh an, tai file."],
  ["Admin", "/admin", "Quan ly khoa phong, verify bac si, sync events."],
  ["Blockchain", "/blockchain", "Kiem tra access, record CID va transaction."],
];

export default function Home() {
  return (
    <section className="grid gap-8 py-10">
      <div className="grid gap-6 lg:grid-cols-[1.2fr_.8fr] lg:items-center">
        <div>
          <p className="label text-blue-700">Electronic Medical Record</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-bold leading-tight md:text-5xl">
            Test day du backend EMR, IPFS va blockchain trong mot giao dien
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-slate-600">
            Frontend nay gom cac man hinh test cho auth, profile, storage, access control,
            medical records, admin va blockchain query.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link className="btn-primary" href="/login">Dang nhap test</Link>
            <Link className="btn-secondary" href="/dashboard">Mo dashboard</Link>
          </div>
        </div>
        <div className="card grid gap-3">
          <h2 className="text-lg font-bold">Tai khoan seed</h2>
          <pre className="rounded-xl bg-slate-950 p-4 text-sm text-slate-100">{`patient@test.local / password123
doctor@test.local  / password123
admin@test.local   / password123`}</pre>
          <p className="text-sm text-slate-600">Dung Ctrl+F5 neu browser dang giu bundle cu.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {MODULES.map(([title, href, text]) => (
          <Link className="card transition hover:border-blue-300 hover:shadow-md" href={href} key={href}>
            <h2 className="text-lg font-bold">{title}</h2>
            <p className="mt-2 text-sm text-slate-600">{text}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
