-- GlicoCare - Credenciais WebAuthn (login biométrico: impressão digital / Face ID / Windows Hello)
-- Corre isto no SQL Editor do Supabase, depois de 001-009 já aplicados.
--
-- Guarda as credenciais WebAuthn (chave pública + metadados) registadas por cada
-- utilizador para login biométrico, como alternativa ao login por password.
--
-- O desafio (challenge) do WebAuthn não é guardado em tabela nenhuma: é assinado num JWT
-- de curta duração (variável de ambiente WEBAUTHN_CHALLENGE_SECRET, ver as Netlify
-- Functions webauthn-*), o que evita precisar de uma tabela extra com expiração/limpeza.
--
-- A verificação da credencial durante o LOGIN (antes de existir sessão, portanto sem
-- auth.uid() válido) é feita pela Netlify Function com a service_role key, que bypassa a
-- RLS abaixo. As políticas de RLS servem apenas a página de gestão de dispositivos do
-- próprio utilizador, já autenticado.

create table if not exists public.webauthn_credentials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  credential_id text unique not null,
  public_key text not null,
  counter bigint not null default 0,
  device_label text,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

create index if not exists idx_webauthn_credentials_user on public.webauthn_credentials(user_id);

alter table public.webauthn_credentials enable row level security;

create policy webauthn_credentials_select_own on public.webauthn_credentials
  for select using (user_id = auth.uid());

create policy webauthn_credentials_insert_own on public.webauthn_credentials
  for insert with check (user_id = auth.uid());

create policy webauthn_credentials_delete_own on public.webauthn_credentials
  for delete using (user_id = auth.uid());
