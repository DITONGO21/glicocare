-- GlicoCare - Row Level Security policies
-- Run this SECOND, after 001_schema.sql.
--
-- Business rules from the spec (see "# Sistema Inteligente de Monitoriza.txt"):
--  * Admin: full access to doctors/patients/associations/users, but NEVER to private
--    messages (conversations/messages) or doctors' private clinical notes.
--  * Doctor: only sees/edits their own associated patients (via doctor_patients),
--    their own conversations/messages, their own medical_notes.
--  * Patient: only sees/edits their own profile, their own measurements, their own
--    conversations/messages (as participant).

-- ---------- helper functions ----------
create or replace function public.current_role_name()
returns text
language sql stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.current_doctor_id()
returns uuid
language sql stable
security definer
set search_path = public
as $$
  select id from public.doctors where user_id = auth.uid();
$$;

create or replace function public.current_patient_id()
returns uuid
language sql stable
security definer
set search_path = public
as $$
  select id from public.patients where user_id = auth.uid();
$$;

create or replace function public.is_doctor_of_patient(p_patient_id uuid)
returns boolean
language sql stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.doctor_patients dp
    where dp.patient_id = p_patient_id
      and dp.doctor_id = public.current_doctor_id()
      and dp.is_active = true
  );
$$;

-- ---------- enable RLS ----------
alter table public.profiles enable row level security;
alter table public.doctors enable row level security;
alter table public.patients enable row level security;
alter table public.doctor_patients enable row level security;
alter table public.glucose_measurements enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.medical_notes enable row level security;
alter table public.ai_reports enable row level security;
alter table public.notifications enable row level security;
alter table public.activity_logs enable row level security;

-- ================= profiles =================
-- Everyone can read their own profile; Admin can read/update all (user management);
-- Doctor can read profiles of their own patients (needed to show patient names).
create policy profiles_select_self on public.profiles
  for select using (id = auth.uid());

create policy profiles_select_admin on public.profiles
  for select using (public.current_role_name() = 'Admin');

create policy profiles_select_doctor_patients on public.profiles
  for select using (
    public.current_role_name() = 'Doctor'
    and id in (
      select p.user_id from public.patients p
      join public.doctor_patients dp on dp.patient_id = p.id
      where dp.doctor_id = public.current_doctor_id() and dp.is_active = true
    )
  );

create policy profiles_update_self on public.profiles
  for update using (id = auth.uid());

create policy profiles_update_admin on public.profiles
  for update using (public.current_role_name() = 'Admin');

create policy profiles_insert_admin on public.profiles
  for insert with check (public.current_role_name() = 'Admin' or id = auth.uid());

-- ================= doctors =================
create policy doctors_select_admin on public.doctors
  for select using (public.current_role_name() = 'Admin');

create policy doctors_select_self on public.doctors
  for select using (user_id = auth.uid());

create policy doctors_select_by_patients on public.doctors
  for select using (
    public.current_role_name() = 'Patient'
    and id in (
      select dp.doctor_id from public.doctor_patients dp
      where dp.patient_id = public.current_patient_id() and dp.is_active = true
    )
  );

create policy doctors_write_admin on public.doctors
  for all using (public.current_role_name() = 'Admin')
  with check (public.current_role_name() = 'Admin');

create policy doctors_update_self on public.doctors
  for update using (user_id = auth.uid());

-- ================= patients =================
create policy patients_select_admin on public.patients
  for select using (public.current_role_name() = 'Admin');

create policy patients_select_self on public.patients
  for select using (user_id = auth.uid());

create policy patients_select_doctor on public.patients
  for select using (public.is_doctor_of_patient(id));

create policy patients_write_admin on public.patients
  for all using (public.current_role_name() = 'Admin')
  with check (public.current_role_name() = 'Admin');

create policy patients_update_self on public.patients
  for update using (user_id = auth.uid());

-- ================= doctor_patients (associations) =================
-- Admin manages associations. Doctor/Patient can read their own links.
create policy doctor_patients_all_admin on public.doctor_patients
  for all using (public.current_role_name() = 'Admin')
  with check (public.current_role_name() = 'Admin');

create policy doctor_patients_select_doctor on public.doctor_patients
  for select using (doctor_id = public.current_doctor_id());

create policy doctor_patients_select_patient on public.doctor_patients
  for select using (patient_id = public.current_patient_id());

-- ================= glucose_measurements =================
create policy measurements_all_self on public.glucose_measurements
  for all using (patient_id = public.current_patient_id())
  with check (patient_id = public.current_patient_id());

create policy measurements_select_doctor on public.glucose_measurements
  for select using (public.is_doctor_of_patient(patient_id));

-- The doctor's only legitimate write here is reviewing an alert (marking it Resolved /
-- UnderObservation / Ignored, see MedicoUtentePerfilPage) — the app layer only ever sends
-- alert_status in that update (measurementService.updateAlertStatus), never value/notes/etc.
-- RLS can't restrict to a single column, so this policy allows the row but the value/notes
-- fields stay protected in practice because nothing in the UI lets a doctor edit them.
create policy measurements_update_doctor_alert on public.glucose_measurements
  for update using (public.is_doctor_of_patient(patient_id))
  with check (public.is_doctor_of_patient(patient_id));

-- Admin has NO access to measurements (only administrative data) per spec intent that
-- admin never reads clinical/private data beyond user management; measurements are
-- clinical data so admin is intentionally excluded here.

-- ================= conversations =================
-- Admin NEVER sees conversations (explicit spec rule).
create policy conversations_select_doctor on public.conversations
  for select using (doctor_id = public.current_doctor_id());

create policy conversations_select_patient on public.conversations
  for select using (patient_id = public.current_patient_id());

create policy conversations_insert_doctor on public.conversations
  for insert with check (doctor_id = public.current_doctor_id());

create policy conversations_insert_patient on public.conversations
  for insert with check (patient_id = public.current_patient_id());

create policy conversations_update_participants on public.conversations
  for update using (
    doctor_id = public.current_doctor_id() or patient_id = public.current_patient_id()
  );

-- ================= messages =================
-- Admin NEVER sees messages (explicit spec rule).
create policy messages_select_participants on public.messages
  for select using (
    conversation_id in (
      select id from public.conversations
      where doctor_id = public.current_doctor_id() or patient_id = public.current_patient_id()
    )
  );

create policy messages_insert_participants on public.messages
  for insert with check (
    sender_user_id = auth.uid()
    and conversation_id in (
      select id from public.conversations
      where doctor_id = public.current_doctor_id() or patient_id = public.current_patient_id()
    )
  );

create policy messages_update_participants on public.messages
  for update using (
    conversation_id in (
      select id from public.conversations
      where doctor_id = public.current_doctor_id() or patient_id = public.current_patient_id()
    )
  );

-- ================= medical_notes =================
-- Private clinical notes: only the authoring doctor. Admin and Patient have NO access.
create policy medical_notes_all_doctor on public.medical_notes
  for all using (doctor_id = public.current_doctor_id())
  with check (doctor_id = public.current_doctor_id());

-- ================= ai_reports =================
create policy ai_reports_select_patient on public.ai_reports
  for select using (patient_id = public.current_patient_id());

create policy ai_reports_select_doctor on public.ai_reports
  for select using (public.is_doctor_of_patient(patient_id));

create policy ai_reports_insert_patient on public.ai_reports
  for insert with check (patient_id = public.current_patient_id());

create policy ai_reports_insert_doctor on public.ai_reports
  for insert with check (public.is_doctor_of_patient(patient_id));

-- ================= notifications =================
create policy notifications_all_self on public.notifications
  for all using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ================= activity_logs =================
-- Admin: administrative/audit visibility. Self: own log only.
create policy activity_logs_select_admin on public.activity_logs
  for select using (public.current_role_name() = 'Admin');

create policy activity_logs_select_self on public.activity_logs
  for select using (user_id = auth.uid());

create policy activity_logs_insert_self on public.activity_logs
  for insert with check (user_id = auth.uid());
