import Link from "next/link";
import { RoleAccess } from "@/lib/auth/use-required-role";

export function AccessState({ access }: { access: Exclude<RoleAccess, "allowed"> }) {
  if (access === "checking") return <p className="status">Đang kiểm tra phiên đăng nhập...</p>;
  return (
    <section className="mx-auto max-w-lg py-10">
      <div className="card text-center">
        <h1 className="text-xl font-bold">
          {access === "unauthenticated" ? "Bạn chưa đăng nhập" : "Tài khoản không có quyền vào khu vực này"}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          {access === "unauthenticated"
            ? "Đăng nhập bằng tài khoản đúng vai trò để tiếp tục."
            : "Hãy sử dụng khu vực phù hợp với vai trò được cấp cho tài khoản."}
        </p>
        <Link className="btn-primary mt-5" href={access === "unauthenticated" ? "/login" : "/"}>
          {access === "unauthenticated" ? "Đến trang đăng nhập" : "Về trang chủ"}
        </Link>
      </div>
    </section>
  );
}
