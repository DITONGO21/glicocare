-- GlicoCare - Consultas médicas e Medicamentos
-- Run this AFTER 001_schema.sql, 002_rls_policies.sql and 003_seed.sql.
-- Incremental migration: does not touch the already-applied 001/002 files.

-- ---------- appointments (consultas médicas) ----------
create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  doctor_id uuid references public.doctors(id) on delete set null,
  doctor_name_freetext text,
  scheduled_at timestamptz not null,
  location text,
  notes text,
  status text not null check (status in ('Agendada','Realizada','Cancelada')) default 'Agendada',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create trigger trg_appointments_updated_at before update on public.appointments
  for each row execute function public.set_updated_at();
create index if not exists idx_appointments_patient on public.appointments(patient_id);
create index if not exists idx_appointments_scheduled_at on public.appointments(scheduled_at);

-- ---------- medications (medicamentos) ----------
create table if not exists public.medications (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  name text not null,
  dosage text,
  frequency text,
  start_date date not null,
  end_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create trigger trg_medications_updated_at before update on public.medications
  for each row execute function public.set_updated_at();
create index if not exists idx_medications_patient on public.medications(patient_id);
