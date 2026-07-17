-- GlicoCare - RLS for doctor_availability
-- Run this AFTER 007_doctor_availability.sql.
--
-- Rule: Doctor has full access to their own availability slots. Patient can only read
-- (select) the slots of doctors they are actively associated with (mirrors
-- doctors_select_by_patients in 002_rls_policies.sql, applied here to availability
-- instead of the doctors table itself). Admin has NO access — this is scheduling data
-- tied to a doctor's clinical practice, not administrative data.

alter table public.doctor_availability enable row level security;

create policy doctor_availability_all_doctor on public.doctor_availability
  for all using (doctor_id = public.current_doctor_id())
  with check (doctor_id = public.current_doctor_id());

create policy doctor_availability_select_patient on public.doctor_availability
  for select using (
    public.current_role_name() = 'Patient'
    and doctor_id in (
      select dp.doctor_id from public.doctor_patients dp
      where dp.patient_id = public.current_patient_id() and dp.is_active = true
    )
  );
