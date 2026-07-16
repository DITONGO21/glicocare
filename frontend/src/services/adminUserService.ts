import { supabase } from "@/services/supabaseClient";
import type { CreateDoctorRequest, CreatePatientRequest, DoctorDto, PatientDto } from "@/types/api";

async function callAdminCreateUser(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("Sessão inválida. Volte a iniciar sessão.");

  const response = await fetch("/.netlify/functions/admin-create-user", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((json as { error?: string }).error ?? "Não foi possível concluir o pedido.");
  }
  return json;
}

export async function adminCreateDoctor(payload: CreateDoctorRequest): Promise<DoctorDto> {
  const result = await callAdminCreateUser({ type: "doctor", ...payload });
  return result as unknown as DoctorDto;
}

export async function adminCreatePatient(payload: CreatePatientRequest): Promise<PatientDto> {
  const result = await callAdminCreateUser({ type: "patient", ...payload });
  return result as unknown as PatientDto;
}
