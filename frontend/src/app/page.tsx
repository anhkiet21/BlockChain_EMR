import Link from "next/link";

const MODULES = [
  {
    icon: "🔐",
    title: "Xác thực",
    href: "/login",
    description: "Đăng nhập với tài khoản seed, đăng ký bệnh nhân/bác sĩ mới.",
    accent: "indigo",
  },
  {
    icon: "👤",
    title: "Hồ sơ",
    href: "/profile",
    description: "Cập nhật thông tin cá nhân và liên kết ví MetaMask.",
    accent: "violet",
  },
  {
    icon: "🩺",
    title: "Bệnh nhân",
    href: "/patient/access",
    description: "Quản lý quyền truy cập hồ sơ bệnh án.",
    accent: "cyan",
  },
  {
    icon: "📁",
    title: "File bệnh án",
    href: "/patient/files",
    description: "Upload, xem danh sách và tải xuống file đã mã hoá.",
    accent: "emerald",
  },
  {
    icon: "🏥",
    title: "Bác sĩ",
    href: "/doctor/records",
    description: "Tìm bệnh nhân, tải file lên IPFS và tạo bệnh án.",
    accent: "blue",
  },
  {
    icon: "⚙️",
    title: "Quản trị",
    href: "/admin",
    description: "Quản lý khoa phòng, xác minh bác sĩ và đồng bộ sự kiện.",
    accent: "amber",
  },
  {
    icon: "⛓️",
    title: "Blockchain",
    href: "/blockchain",
    description: "Kiểm tra quyền, CID và trạng thái giao dịch on-chain.",
    accent: "purple",
  },
] as const;

type Accent = "indigo" | "violet" | "cyan" | "emerald" | "blue" | "amber" | "purple";

const ACCENT_STYLES: Record<Accent, { border: string; icon: string; arrow: string }> = {
  indigo:  { border: "hover:border-indigo-500/40",  icon: "bg-indigo-500/15 group-hover:bg-indigo-500/25",  arrow: "text-indigo-400" },
  violet:  { border: "hover:border-violet-500/40",  icon: "bg-violet-500/15 group-hover:bg-violet-500/25",  arrow: "text-violet-400" },
  cyan:    { border: "hover:border-cyan-500/40",    icon: "bg-cyan-500/15   group-hover:bg-cyan-500/25",    arrow: "text-cyan-400"   },
  emerald: { border: "hover:border-emerald-500/40", icon: "bg-emerald-500/15 group-hover:bg-emerald-500/25", arrow: "text-emerald-400"},
  blue:    { border: "hover:border-blue-500/40",    icon: "bg-blue-500/15   group-hover:bg-blue-500/25",    arrow: "text-blue-400"   },
  amber:   { border: "hover:border-amber-500/40",   icon: "bg-amber-500/15  group-hover:bg-amber-500/25",   arrow: "text-amber-400"  },
  purple:  { border: "hover:border-purple-500/40",  icon: "bg-purple-500/15 group-hover:bg-purple-500/25",  arrow: "text-purple-400" },
};

export default function Home() {
  return (
    <section className="grid gap-16 py-10 animate-fade-in">

      {/* ── Hero ── */}
      <div className="grid gap-10 lg:grid-cols-[1fr_420px] lg:items-center">

        {/* Left: headline + CTAs */}
        <div className="grid gap-6">
          {/* Live pulse badge */}
          <div className="flex items-center gap-2.5 w-fit rounded-full border border-indigo-500/20 bg-indigo-500/10 px-4 py-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-500" />
            </span>
            <span className="text-xs font-semibold tracking-widest text-indigo-300 uppercase">
              Hệ thống quản lý hồ sơ bệnh án điện tử
            </span>
          </div>

          {/* H1 */}
          <h1 className="text-5xl font-black leading-[1.1] tracking-tight text-white md:text-6xl">
            <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
              Bảo mật
            </span>
            <span className="text-slate-600 mx-3">·</span>
            <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-fuchsia-400 bg-clip-text text-transparent">
              Minh bạch
            </span>
            <span className="text-slate-600 mx-3">·</span>
            <span className="bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 bg-clip-text text-transparent">
              Bất biến
            </span>
          </h1>

          {/* Subtitle */}
          <p className="max-w-xl text-lg leading-relaxed text-slate-400">
            Hồ sơ bệnh án điện tử được bảo vệ bởi{" "}
            <span className="font-medium text-indigo-400">công nghệ Blockchain Ethereum</span>,
            lưu trữ phi tập trung trên{" "}
            <span className="font-medium text-violet-400">IPFS</span> và mã hoá đầu cuối —
            đảm bảo tính toàn vẹn, minh bạch và không thể giả mạo.
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Link
              href="/login"
              className="btn-primary px-7 py-3 text-base shadow-lg shadow-indigo-600/30 animate-pulse-glow"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
              </svg>
              Đăng nhập
            </Link>
            <Link
              href="/dashboard"
              className="btn-secondary px-7 py-3 text-base"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
              </svg>
              Xem Dashboard
            </Link>
          </div>

          {/* Tech stack pills */}
          <div className="flex flex-wrap gap-2 pt-1">
            {["Ethereum", "Solidity", "IPFS", "Spring Boot", "Next.js", "TypeScript"].map((tech) => (
              <span
                key={tech}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-500"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>

        {/* Right: test accounts card */}
        <div className="card-glass relative overflow-hidden">
          {/* Glow accent */}
          <div className="pointer-events-none absolute -top-12 -right-12 h-48 w-48 rounded-full bg-indigo-600/10 blur-2xl" />

          <div className="relative grid gap-4">
            {/* Card header */}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20">
                <svg className="w-5 h-5 text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-white">Tài khoản seed</p>
                <p className="text-xs text-slate-500">Dùng để thử nghiệm hệ thống</p>
              </div>
            </div>

            {/* Code block */}
            <div className="relative overflow-hidden rounded-xl border border-white/10 bg-slate-950/80">
              {/* Terminal dots */}
              <div className="flex items-center gap-1.5 border-b border-white/5 px-4 py-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/70" />
                <span className="ml-2 font-mono text-xs text-slate-600">credentials.env</span>
              </div>
              <pre className="mono overflow-x-auto px-4 py-4 text-sm leading-7">
                <span className="text-slate-600"># Bệnh nhân{"\n"}</span>
                <span className="text-emerald-400">patient</span>
                <span className="text-slate-400">@test.local</span>
                <span className="text-slate-600">  /  </span>
                <span className="text-amber-300">password123</span>
                {"\n"}
                <span className="text-slate-600"># Bác sĩ{"\n"}</span>
                <span className="text-blue-400">doctor</span>
                <span className="text-slate-400">@test.local</span>
                <span className="text-slate-600">    /  </span>
                <span className="text-amber-300">password123</span>
                {"\n"}
                <span className="text-slate-600"># Cơ sở y tế{"\n"}</span>
                <span className="text-teal-400">institution</span>
                <span className="text-slate-400">@test.local</span>
                <span className="text-slate-600"> /  </span>
                <span className="text-amber-300">password123</span>
                {"\n"}
                <span className="text-slate-600"># Quản trị viên{"\n"}</span>
                <span className="text-violet-400">admin</span>
                <span className="text-slate-400">@test.local</span>
                <span className="text-slate-600">     /  </span>
                <span className="text-amber-300">password123</span>
              </pre>
            </div>

            {/* Role badges */}
            <div className="grid grid-cols-4 gap-2 text-center">
              <span className="badge-emerald justify-center">PATIENT</span>
              <span className="badge-indigo  justify-center">DOCTOR</span>
              <span className="badge-violet  justify-center">INSTITUTION</span>
              <span className="badge-red     justify-center">ADMIN</span>
            </div>

            {/* Note */}
            <p className="flex items-start gap-1.5 text-xs text-slate-600">
              <svg className="mt-0.5 h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
              </svg>
              Nhấn Ctrl+F5 nếu trình duyệt giữ bundle cũ.
            </p>
          </div>
        </div>
      </div>

      {/* ── Stats strip ── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { value: "7",    label: "Mô-đun chức năng", icon: "⬡"   },
          { value: "3",    label: "Vai trò hệ thống",  icon: "👥"  },
          { value: "E2E",  label: "Mã hoá đầu cuối",   icon: "🔒" },
          { value: "IPFS", label: "Lưu trữ phân tán",  icon: "🌐" },
        ].map(({ value, label, icon }) => (
          <div key={label} className="card text-center">
            <div className="text-2xl mb-1">{icon}</div>
            <div className="text-2xl font-black text-white">{value}</div>
            <div className="mt-1 text-xs text-slate-500">{label}</div>
          </div>
        ))}
      </div>

      {/* ── Feature modules grid ── */}
      <div className="grid gap-6">
        <div className="flex items-center gap-4">
          <div>
            <p className="label">Khám phá hệ thống</p>
            <h2 className="section-title mt-1">Các mô-đun chức năng</h2>
          </div>
          <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {MODULES.map((mod, i) => {
            const a = ACCENT_STYLES[mod.accent];
            return (
              <Link
                key={mod.href}
                href={mod.href}
                className={`card-hover group relative overflow-hidden ${a.border} animate-fade-in`}
                style={{ animationDelay: `${i * 0.06}s` }}
              >
                {/* Hover glow overlay */}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                <div className="relative flex items-start gap-4">
                  {/* Icon bubble */}
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl
                                transition-all duration-300 ${a.icon}`}
                  >
                    {mod.icon}
                  </div>

                  {/* Text */}
                  <div className="grid min-w-0 gap-1.5">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold leading-snug text-white">
                        {mod.title}
                      </h3>
                      <svg
                        className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200
                                    group-hover:translate-x-0.5 ${a.arrow}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                      </svg>
                    </div>
                    <p className="text-sm leading-relaxed text-slate-400">
                      {mod.description}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── Footer tagline ── */}
      <footer className="border-t border-white/5 pt-6">
        <p className="text-center text-xs tracking-wide text-slate-600">
          Powered by{" "}
          <span className="font-medium text-indigo-500">Ethereum Blockchain</span>
          {" · "}
          <span className="font-medium text-violet-500">IPFS Storage</span>
          {" · "}
          <span className="font-medium text-emerald-500">Spring Boot</span>
        </p>
      </footer>

    </section>
  );
}
