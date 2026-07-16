-- GlicoCare - RLS for appointments and medications
-- Run this AFTER 004_appointments_medications.sql.
--
-- Rule (same as glucose_measurements): Patient has full access to their own records.
-- Doctor has read-only access to records of patients associated with them
-- (via is_doctor_of_patient, defined in 002_rls_policies.sql). Admin has NO access
-- (clinical data, consistent with the existing rule that Admin never sees clinical data).

alter table public.appointments enable row level security;
alter table public.medications enable row level security;

-- ================= appointments =================
create policy appointments_all_self on public.appointments
  for all using (patient_id = public.current_patient_id())
  with check (patient_id = public.current_patient_id());

create policy appointments_select_doctor on public.appointments
  for select using (public.is_doctor_of_patient(patient_id));

-- ================= medications =================
create policy medications_all_self on public.medications
  for all using (patient_id = public.current_patient_id())
  with check (patient_id = public.current_patient_id());

create policy medications_select_doctor on public.medications
  for select using (public.is_doctor_of_patient(patient_id));
