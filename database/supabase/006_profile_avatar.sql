-- GlicoCare - Foto de perfil e alteração de email
-- Corre isto no SQL Editor do Supabase, depois de 001-005 já aplicados.

-- 1. Coluna para guardar o URL público do avatar em profiles.
alter table public.profiles add column if not exists avatar_url text;

-- 2. O bucket "avatars" já foi criado (via Admin API, storage.createBucket).
--    Falta só a RLS do storage: qualquer pessoa autenticada pode ver avatares (bucket
--    público), mas só o dono pode fazer upload/atualizar/apagar o seu
--    próprio ficheiro. Os ficheiros são guardados com o nome
--    "<user_id>/<ficheiro>", por isso o dono é o primeiro segmento do path.
create policy avatars_public_read on storage.objects
  for select using (bucket_id = 'avatars');

create policy avatars_owner_insert on storage.objects
  for insert with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy avatars_owner_update on storage.objects
  for update using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy avatars_owner_delete on storage.objects
  for delete using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
