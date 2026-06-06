"use client";

import { useEffect, useState } from "react";
import { getSession } from "@/lib/api/client";

export type RoleAccess = "checking" | "allowed" | "unauthenticated" | "forbidden";

export function useRequiredRole(role: "PATIENT" | "DOCTOR" | "ADMIN"): RoleAccess {
  const [access, setAccess] = useState<RoleAccess>("checking");
  useEffect(() => {
    const session = getSession();
    if (!session) return setAccess("unauthenticated");
    setAccess(session.user.roles.includes(role) ? "allowed" : "forbidden");
  }, [role]);
  return access;
}

export function useAnyRequiredRole(roles: Array<"PATIENT" | "DOCTOR" | "ADMIN">): RoleAccess {
  const [access, setAccess] = useState<RoleAccess>("checking");
  useEffect(() => {
    const session = getSession();
    if (!session) return setAccess("unauthenticated");
    setAccess(roles.some((role) => session.user.roles.includes(role)) ? "allowed" : "forbidden");
  }, [roles.join("|")]);
  return access;
}
