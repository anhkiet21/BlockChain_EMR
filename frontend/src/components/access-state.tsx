import Link from 'next/link';

/* ── Prop types ─────────────────────────────────────────────────────────── */
export type AccessProp = 'loading' | 'redirect' | 'denied' | 'allowed';

/* ── Spinner ────────────────────────────────────────────────────────────── */
function Spinner({ color = 'border-indigo-500' }: { color?: string }) {
  return (
    <div
      className={`h-10 w-10 rounded-full border-[3px] border-t-transparent animate-spin ${color}`}
    />
  );
}

/* ── Full-height wrapper ─────────────────────────────────────────────────── */
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5 px-4 text-center">
      {children}
    </div>
  );
}

/* ── Main component ─────────────────────────────────────────────────────── */
export function AccessState({ access }: { access: AccessProp }) {
  /* Loading — checking session */
  if (access === 'loading') {
    return (
      <Shell>
        {/* Outer ring decoration */}
        <div className="relative flex items-center justify-center">
          <div className="absolute h-20 w-20 rounded-full bg-indigo-500/10 animate-pulse" />
          <Spinner color="border-indigo-500" />
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold text-slate-300">
            Đang kiểm tra quyền truy cập…
          </p>
          <p className="text-xs text-slate-500">Vui lòng chờ trong giây lát</p>
        </div>
      </Shell>
    );
  }

  /* Redirect — being sent to login */
  if (access === 'redirect') {
    return (
      <Shell>
        <div className="relative flex items-center justify-center">
          <div className="absolute h-20 w-20 rounded-full bg-indigo-500/10 animate-pulse" />
          <Spinner color="border-indigo-400" />
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold text-slate-300">
            Đang chuyển hướng đến trang đăng nhập…
          </p>
          <p className="text-xs text-slate-500">Bạn sẽ được chuyển trang ngay bây giờ</p>
        </div>
      </Shell>
    );
  }

  /* Denied — no permission */
  if (access === 'denied') {
    return (
      <Shell>
        {/* Lock icon with glow */}
        <div className="relative flex items-center justify-center">
          <div className="absolute h-24 w-24 rounded-full bg-red-500/10 blur-xl" />
          <div className="relative h-16 w-16 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center shadow-lg shadow-red-500/10">
            <svg
              className="h-8 w-8 text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.8}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25
                   2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25
                   2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
              />
            </svg>
          </div>
        </div>

        {/* Text */}
        <div className="flex flex-col gap-2 max-w-sm">
          <h2 className="text-xl font-bold text-white tracking-tight">
            Không có quyền truy cập
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            Bạn không có quyền để xem trang này.
            <br />
            Hãy liên hệ quản trị viên nếu bạn cho rằng đây là nhầm lẫn.
          </p>
        </div>

        {/* Badge */}
        <span className="badge-red text-xs">
          Quyền bị từ chối
        </span>

        {/* Home button */}
        <Link href="/" className="btn-secondary mt-2 gap-2">
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5
                 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125
                 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0
                 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
            />
          </svg>
          Về trang chủ
        </Link>
      </Shell>
    );
  }

  /* Allowed — render nothing, page content shows */
  return null;
}
