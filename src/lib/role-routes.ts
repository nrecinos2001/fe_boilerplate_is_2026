import type { Role } from "@/src/types/auth";

const DEFAULT_HOME = "/dashboard";

// Pantalla inicial de cada rol. El backend solo devuelve el rol; la vista
// que le corresponde se decide aquí.
const ROLE_HOME: Partial<Record<Role, string>> = {
  TRAINER: "/trainer",
};

export function homeRouteForRole(role: Role | null | undefined): string {
  return (role && ROLE_HOME[role]) || DEFAULT_HOME;
}
