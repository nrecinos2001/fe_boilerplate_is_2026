"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { homeRouteForRole } from "@/src/lib/role-routes";
import { useRole } from "@/src/stores/useAuthStore";

// El proxy envía a /dashboard a quien entra a /login con sesión activa, sin
// conocer su rol. Aquí se le lleva a la pantalla inicial que le corresponde.
export function RoleRedirect() {
  const role = useRole();
  const router = useRouter();
  const home = homeRouteForRole(role);

  useEffect(() => {
    if (role && home !== "/dashboard") router.replace(home);
  }, [role, home, router]);

  return null;
}
