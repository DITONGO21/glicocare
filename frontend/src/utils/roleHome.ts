import type { RoleName } from "@/types/api";

export function homeForRole(role: RoleName): string {
  switch (role) {
    case "Admin":
      return "/admin";
    case "Doctor":
      return "/medico";
    case "Patient":
      return "/utente";
  }
}
