import Link from "next/link";
import { RoleAccess } from "@/lib/auth/use-required-role";

export function AccessState({ access }: { access: Exclude<RoleAccess, "allowed"> }) {
  if (access === "checking") return <p className="status">Dang kiem tra phien dang nhap...</p>;
  return (
    <section className="mx-auto max-w-lg py-10">
      <div className="card text-center">
        <h1 className="text-xl font-bold">
          {access === "unauthenticated" ? "Ban chua dang nhap" : "Tai khoan khong co quyen vao khu vuc nay"}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          {access === "unauthenticated"
            ? "Dang nhap bang tai khoan dung vai tro de tiep tuc."
            : "Hay dung khu vuc phu hop voi role cua tai khoan."}
        </p>
        <Link className="btn-primary mt-5" href={access === "unauthenticated" ? "/login" : "/dashboard"}>
          {access === "unauthenticated" ? "Den trang dang nhap" : "Ve dashboard"}
        </Link>
      </div>
    </section>
  );
}
