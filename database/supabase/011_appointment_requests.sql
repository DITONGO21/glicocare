-- GlicoCare - Pedidos de consulta (utente requisita, médico aprova/recusa)
-- Corre isto no SQL Editor do Supabase, depois de 001-008 já aplicados.

-- 1. O utente deixa de poder "agendar" diretamente: passa a criar um PEDIDO, que fica
--    'Pendente' até o médico o aprovar ('Agendada') ou recusar ('Recusada').
alter table public.appointments drop constraint if exists appointments_status_check;
alter table public.appointments add constraint appointments_status_check
  check (status in ('Pendente','Agendada','Recusada','Realizada','Cancelada'));
alter table public.appointments alter column status set default 'Pendente';

-- 2. RLS: o médico já tinha só "select" (005_appointments_medications_rls.sql); passa a
--    poder também aprovar/recusar/ajustar (update) as consultas dos seus pacientes
--    associados. Tal como em measurements_update_doctor_alert (002_rls_policies.sql), a
--    RLS não restringe a coluna — quem impede o médico de editar campos indevidos é a UI,
--    que só envia status/scheduled_at/location/notes/doctor_id no fluxo de aprovação.
create policy appointments_update_doctor on public.appointments
  for update using (public.is_doctor_of_patient(patient_id))
  with check (public.is_doctor_of_patient(patient_id));
