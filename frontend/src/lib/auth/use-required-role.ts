"use client";

import { useEffect, useState } from "react";
import { getSession } from "@/lib/api/client";

export type RoleAccess = "checking" | "allowed" | "unauthenticated" | "forbidden";

export function useRequiredRole(role: "PATIENT" | "DOCTOR"): RoleAccess {
  const [access, setAccess] = useState<RoleAccess>("checking");
  useEffect(() => {
    const session = getSession();
    if (!session) return setAccess("unauthenticated");
    setAccess(session.user.roles.includes(role) ? "allowed" : "forbidden");
  }, [role]);
  return access;
}
