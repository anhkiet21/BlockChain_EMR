"use client";

import { useEffect, useState } from "react";
import { getSession } from "@/lib/api/client";
import type { AccessProp } from "@/components/access-state";

export type RoleAccess = AccessProp;

export function useRequiredRole(role: "PATIENT" | "DOCTOR" | "ADMIN" | "INSTITUTION"): AccessProp {
  const [access, setAccess] = useState<AccessProp>("loading");
  useEffect(() => {
    const session = getSession();
    if (!session) {
      setAccess("redirect");
      location.href = "/login";
      return;
    }
    setAccess(session.user.roles.includes(role) ? "allowed" : "denied");
  }, [role]);
  return access;
}

export function useAnyRequiredRole(roles: Array<"PATIENT" | "DOCTOR" | "ADMIN" | "INSTITUTION">): AccessProp {
  const [access, setAccess] = useState<AccessProp>("loading");
  useEffect(() => {
    const session = getSession();
    if (!session) {
      setAccess("redirect");
      location.href = "/login";
      return;
    }
    setAccess(roles.some((r) => session.user.roles.includes(r)) ? "allowed" : "denied");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roles.join("|")]);
  return access;
}
