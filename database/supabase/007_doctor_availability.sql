-- GlicoCare - Disponibilidade do médico (agenda)
-- Run this AFTER 001-006.

create table if not exists public.doctor_availability (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.doctors(id) on delete cascade,
  weekday int not null check (weekday between 0 and 6), -- 0 = Domingo ... 6 = Sábado
  start_time time not null,
  end_time time not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (end_time > start_time)
);
create trigger trg_doctor_availability_updated_at before update on public.doctor_availability
  for each row execute function public.set_updated_at();
create index if not exists idx_doctor_availability_doctor on public.doctor_availability(doctor_id);
create index if not exists idx_doctor_availability_weekday on public.doctor_availability(weekday);
