-- GlicoCare - Supabase Postgres schema
-- Mirrors backend/src/GlicoCare.Domain/Entities/*.cs and Enums/*.cs
-- Run this FIRST in the Supabase SQL Editor (or via `supabase db push`).

create extension if not exists "pgcrypto";

-- ---------- ENUM-like check constraints (kept as text to make RLS/joins simple) ----------
-- role: 'Admin' | 'Doctor' | 'Patient'
-- measurement source: 'Manual' | 'ESP32Simulado'
-- alert status: 'None' | 'Resolved' | 'UnderObservation' | 'Ignored'
-- notification type: 'NewMessage' | 'NewMeasurement' | 'HighGlucoseValue' | 'LowGlucoseValue' | 'WeeklySummary' | 'SystemUpdate'
-- message status: 'Unread' | 'Read'
-- ai report type: 'Daily' | 'Weekly' | 'Monthly'

-- ---------- updated_at trigger helper ----------
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ---------- profiles (1:1 with auth.users) ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  role text not null check (role in ('Admin','Doctor','Patient')),
  is_active boolean not null default true,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create trigger trg_profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------- doctors ----------
create table if not exists public.doctors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  license_number text not null,
  specialty text not null,
  phone_number text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create trigger trg_doctors_updated_at before update on public.doctors
  for each row execute function public.set_updated_at();

-- ---------- patients ----------
create table if not exists public.patients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  date_of_birth date,
  phone_number text,
  diabetes_type text,
  target_glucose_min double precision,
  target_glucose_max double precision,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create trigger trg_patients_updated_at before update on public.patients
  for each row execute function public.set_updated_at();

-- ---------- doctor_patients (association, many-to-many) ----------
create table if not exists public.doctor_patients (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.doctors(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (doctor_id, patient_id)
);
create trigger trg_doctor_patients_updated_at before update on public.doctor_patients
  for each row execute function public.set_updated_at();
create index if not exists idx_doctor_patients_doctor on public.doctor_patients(doctor_id);
create index if not exists idx_doctor_patients_patient on public.doctor_patients(patient_id);

-- ---------- glucose_measurements ----------
create table if not exists public.glucose_measurements (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  value_mg_dl double precision not null,
  measured_at timestamptz not null,
  source text not null check (source in ('Manual','ESP32Simulado')) default 'Manual',
  notes text,
  alert_status text not null check (alert_status in ('None','Resolved','UnderObservation','Ignored')) default 'None',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create trigger trg_glucose_measurements_updated_at before update on public.glucose_measurements
  for each row execute function public.set_updated_at();
create index if not exists idx_measurements_patient on public.glucose_measurements(patient_id);
create index if not exists idx_measurements_measured_at on public.glucose_measurements(measured_at);

-- ---------- conversations ----------
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.doctors(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (doctor_id, patient_id)
);
create trigger trg_conversations_updated_at before update on public.conversations
  for each row execute function public.set_updated_at();

-- ---------- messages ----------
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  status text not null check (status in ('Unread','Read')) default 'Unread',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create trigger trg_messages_updated_at before update on public.messages
  for each row execute function public.set_updated_at();
create index if not exists idx_messages_conversation on public.messages(conversation_id);

-- ---------- medical_notes (private doctor notes about a patient) ----------
create table if not exists public.medical_notes (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.doctors(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create trigger trg_medical_notes_updated_at before update on public.medical_notes
  for each row execute function public.set_updated_at();
create index if not exists idx_medical_notes_patient on public.medical_notes(patient_id);
create index if not exists idx_medical_notes_doctor on public.medical_notes(doctor_id);

-- ---------- ai_reports ----------
create table if not exists public.ai_reports (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  type text not null check (type in ('Daily','Weekly','Monthly')),
  summary text not null,
  recommendations text not null,
  reference_date timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create trigger trg_ai_reports_updated_at before update on public.ai_reports
  for each row execute function public.set_updated_at();
create index if not exists idx_ai_reports_patient on public.ai_reports(patient_id);

-- ---------- notifications ----------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('NewMessage','NewMeasurement','HighGlucoseValue','LowGlucoseValue','WeeklySummary','SystemUpdate')),
  title text not null,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create trigger trg_notifications_updated_at before update on public.notifications
  for each row execute function public.set_updated_at();
create index if not exists idx_notifications_user on public.notifications(user_id);

-- ---------- activity_logs ----------
create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  action text not null,
  details text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create trigger trg_activity_logs_updated_at before update on public.activity_logs
  for each row execute function public.set_updated_at();
create index if not exists idx_activity_logs_user on public.activity_logs(user_id);
